package com.sharefable.api.service;

import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.concurrent.Semaphore;

/** Remote capture assets are untrusted network input, including every redirect. */
@Component
public class SafeAssetFetcher {
  static final int MAX_BYTES = 20 * 1024 * 1024;
  private final Semaphore capacity = new Semaphore(4);
  private final CloseableHttpClient client;

  public SafeAssetFetcher() {
    DnsResolver resolver = new DnsResolver() {
      public InetAddress[] resolve(String host) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(host);
        for (InetAddress address : addresses) {
          if (!isPublicAddress(address)) throw new UnknownHostException("Asset destination is not public");
        }
        return addresses;
      }

      public String resolveCanonicalHostname(String host) { return host; }
    };
    client = HttpClients.custom()
      .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create().setDnsResolver(resolver).build())
      .setDefaultRequestConfig(RequestConfig.custom()
        .setConnectTimeout(Timeout.ofSeconds(5))
        .setConnectionRequestTimeout(Timeout.ofSeconds(5))
        .setResponseTimeout(Timeout.ofSeconds(5)).build())
      .disableRedirectHandling().disableAutomaticRetries().disableCookieManagement().build();
  }

  static URI validateUrl(String value) {
    URI uri = URI.create(value);
    if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
      || uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
      || !(uri.getPort() == -1 || uri.getPort() == 80 || uri.getPort() == 443)) {
      throw new IllegalArgumentException("Asset URL must use public HTTP(S) without credentials or a custom port");
    }
    return uri;
  }

  static boolean isPublicAddress(InetAddress address) {
    if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
      || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
    byte[] bytes = address.getAddress();
    int a = bytes[0] & 255, b = bytes[1] & 255, c = bytes[2] & 255;
    if (bytes.length == 4) {
      return !(a == 0 || a == 10 || a == 127 || a >= 224
        || (a == 100 && b >= 64 && b <= 127) || (a == 169 && b == 254)
        || (a == 172 && b >= 16 && b <= 31)
        || (a == 192 && (b == 168 || (b == 0 && (c == 0 || c == 2))))
        || (a == 198 && (b == 18 || b == 19 || (b == 51 && c == 100)))
        || (a == 203 && b == 0 && c == 113));
    }
    // Global unicast only; exclude translation/tunnelling and documentation ranges.
    return (a & 224) == 32 && !(a == 32 && b == 2)
      && !(a == 32 && b == 1 && (c <= 1 || (c == 13 && (bytes[3] & 255) == 184)));
  }

  public record Asset(int status, String type, String location, byte[] body) {}

  public Asset fetch(String value, String cookie, String userAgent) throws IOException {
    URI uri = validateUrl(value);
    // Literal addresses can bypass a connection manager's DNS resolver.
    for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
      if (!isPublicAddress(address)) throw new IOException("Asset destination is not public");
    }
    if (!capacity.tryAcquire()) throw new IOException("Asset fetch capacity reached; retry later");
    try {
      HttpGet request = new HttpGet(uri);
      if (cookie != null && !cookie.isBlank()) request.setHeader("Cookie", cookie);
      if (userAgent != null && !userAgent.isBlank()) request.setHeader("User-Agent", userAgent);
      long deadline = System.nanoTime() + 30_000_000_000L;
      return client.execute(request, response -> {
        String type = response.getFirstHeader("Content-Type") == null ? "application/octet-stream"
          : response.getFirstHeader("Content-Type").getValue();
        String location = response.getFirstHeader("Location") == null ? ""
          : response.getFirstHeader("Location").getValue();
        if (response.getCode() < 200 || response.getCode() >= 300 || response.getEntity() == null) {
          return new Asset(response.getCode(), type, location, new byte[0]);
        }
        if (response.getEntity().getContentLength() > MAX_BYTES) throw new IOException("Asset exceeds size limit");
        try (var input = response.getEntity().getContent(); var output = new ByteArrayOutputStream()) {
          byte[] buffer = new byte[8192];
          int count;
          while ((count = input.read(buffer)) != -1) {
            if (output.size() + count > MAX_BYTES || System.nanoTime() > deadline) {
              request.cancel();
              throw new IOException("Asset exceeds size or time limit");
            }
            output.write(buffer, 0, count);
          }
          return new Asset(response.getCode(), type, location, output.toByteArray());
        }
      });
    } finally {
      capacity.release();
    }
  }

  @PreDestroy
  public void close() throws IOException { client.close(); }
}
