package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.Utils;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.ProxyAsset;
import com.sharefable.api.repo.ProxyAssetRepo;
import com.sharefable.api.transport.ParsedReqProxyAsset;
import com.sharefable.api.transport.resp.RespProxyAsset;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustStrategy;
import org.javatuples.Pair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class ProxyAssetService {
  private final ProxyAssetRepo proxyAssetRepo;
  private final List<RestTemplate> restClientChain = new ArrayList<>(2);
  private final S3Service s3Service;
  private final S3Config s3Config;

  String[] ignoreList = new String[]{"fonts.googleapis.com"};

  @Autowired
  public ProxyAssetService(ProxyAssetRepo proxyAssetRepo, S3Service s3Service, S3Config s3Config) {
    this.proxyAssetRepo = proxyAssetRepo;
    this.s3Service = s3Service;
    this.s3Config = s3Config;

    RestTemplate primaryRestClient = new RestTemplate();
    restClientChain.add(primaryRestClient);
    restClientChain.add(new RestTemplate());

    DefaultUriBuilderFactory defaultUriBuilderFactory = new DefaultUriBuilderFactory();
    defaultUriBuilderFactory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);
    restClientChain.forEach(client -> client.setUriTemplateHandler(defaultUriBuilderFactory));

    // This has been added because sometimes jvm runs into 'PKIX path building failed' exception when it can't find
    // a certificate in its trust store. Ref: https://stackoverflow.com/questions/55693919/getting-pkix-path-building-failed-validatorexception-while-requesting-a-url.
    // while we proxy a resource.
    // We normally don't want to check for SSL validation when proxying other resource, this following code disable checking ssl validation.
    // Reference: https://stackoverflow.com/questions/4072585/disabling-ssl-certificate-validation-in-spring-resttemplate
    // We had to upgrade HTTPClient to achieve this, some imports needed to be upgraded https://stackoverflow.com/questions/74688513/httpclients-custom-setsslsocketfactory-method-not-found
    try {
      TrustStrategy acceptingTrustStrategy = (X509Certificate[] chain, String authType) -> true;
      SSLContext sslContext = org.apache.http.ssl.SSLContexts.custom().loadTrustMaterial(null, acceptingTrustStrategy).build();
      SSLConnectionSocketFactory csf = new SSLConnectionSocketFactory(sslContext);
      CloseableHttpClient httpClient = HttpClients.custom().setConnectionManager(
        PoolingHttpClientConnectionManagerBuilder.create().setSSLSocketFactory(csf).build()
      ).build();
      HttpComponentsClientHttpRequestFactory requestFactory = new HttpComponentsClientHttpRequestFactory();
      requestFactory.setHttpClient(httpClient);
      primaryRestClient.setRequestFactory(requestFactory);
    } catch (NoSuchAlgorithmException | KeyStoreException | KeyManagementException e) {
      log.warn("Can't bypass certificate checking while initing resttemplate, falling back to default behaviour", e);
    }
  }


  /*
   * Executing request via list of restTemplate client (chain) is a terrible approach, but it's implemented for lack
   * of time and research.
   * Chain's content [primaryRestClient, secondaryRestClient, ... (others in future)]
   *
   * For the primaryRestClient, we use apachehttpclient5 as an HttpClient. This client library adds Content-Length: 0
   * header even for get request. This header cannot be removed. We tried removing the header by adding requestInterceptor.
   * It did remove from http protocol, but the library threw an internal error regarding required length.
   * The http protocol does not clearly say, what needs to be done if GET request is sent with no body (which is the case
   * majorly). Some server (canva private asset server) throws error when Content-Length: 0.
   * Try with this asset: https://media.canva.com/v2/image-resize/format:PNG/height:140/quality:100/uri:s3%3A%2F%2Fmedia-private.canva.com%2FIWoG8%2FMAGFHRIWoG8%2F1%2Fp.svg/watermark:F/width:550?csig=AAAAAAAAAAAAAAAAAAAAAFBWLKgWZ6r8z-jtVNB4LG9KnWG4ZMvitSRa53Zj0yXg&exp=1731149379&osig=AAAAAAAAAAAAAAAAAAAAAGRXndcSB74rQ67tDkIyWU4JLYdotZ336fXoYMZkV4iH&signer=media-rpc&x-canva-quality=thumbnail_large
   * You can try from terminal to replicate the behaviour by sending raw text protocol data: openssl s_client -connect media.canva.com:443
   *
   * So when this happens, we fallback to the next client in the chain - this client uses spring's default HttpClient
   * which behaves properly.
   *
   * How the primaryClient uses apachehttpclient5 to bypass an SSL error that JVM throws 'PKIX path building failed'.
   * See comment above.
   */
  private ResponseEntity<byte[]> executeRequestViaChain(String origin, HttpEntity<Void> entity) {
    for (int i = 0, l = restClientChain.size(); i < l; i++) {
      try {
        return restClientChain.get(i).exchange(origin, HttpMethod.GET, entity, byte[].class);
      } catch (HttpStatusCodeException ex) {
        if (ex.getStatusCode().isSameCodeAs(HttpStatus.BAD_REQUEST) && i < l - 1) {
          log.warn("Cannot get asset {} [Status: {}, resp from server: {}]", origin, ex.getStatusCode(), ex.getResponseBodyAsString());
          continue;
        }
        throw ex;
      }
    }
    throw new RuntimeException("[This is not a valid state]. Could not complete request {}" + origin);
  }


  @Transactional
  public RespProxyAsset createProxyAsset(ParsedReqProxyAsset body, int depth, Map<String, RespProxyAsset> proxiedAsset) {
    String origin = body.getOrigin();
    String hashedOrigin = DigestUtils.sha1Hex(origin);

    if (depth >= 8) {
      log.error("The depth of css file is greater than the pre defined depth {}", origin);
      return RespProxyAsset.from(origin);
    }

    try {
      boolean shouldIgnore = Utils.isUrlPresentInIgnoreList(new URL(origin), ignoreList);
      if (shouldIgnore) {
        return RespProxyAsset.from(origin);
      }
    } catch (MalformedURLException e) {
      log.error("Could not match with ignore list as the url {} could not be parsed to URL.", origin);
      Sentry.captureException(e);
      return RespProxyAsset.from(origin);
    }

    Optional<ProxyAsset> maybeProxyAsset = proxyAssetRepo.findProxyAssetByRid(hashedOrigin);
    if (maybeProxyAsset.isPresent()) {
      ProxyAsset proxyAsset = maybeProxyAsset.get();
      RespProxyAsset respProxyAsset = RespProxyAsset.from(proxyAsset, s3Config);
      if (body.getBody().get()) {
        String proxyUri = proxyAsset.getProxyUri();
        AssetFilePath assetFilePath = s3Config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, proxyUri);
        try {
          byte[] content = s3Service.getObjectContent(assetFilePath);
          respProxyAsset.setContent(Optional.of(new String(content)));
        } catch (IOException e) {
          log.error("Something went wrong while getting content from s3 for origin {} {}", origin, e.getMessage());
          Sentry.captureException(e);
          return RespProxyAsset.WithError(origin);
        }
      }
      return respProxyAsset;
    }

    try {
      HttpHeaders headers = new HttpHeaders();
      if (!StringUtils.isBlank(body.getCookie())) {
        headers.add(HttpHeaders.COOKIE, body.getCookie());
      }
      if (!StringUtils.isBlank(body.getUserAgent())) {
        headers.add(HttpHeaders.USER_AGENT, body.getUserAgent());
      }
      HttpEntity<Void> entity = new HttpEntity<>(headers);


      ResponseEntity<byte[]> resp = executeRequestViaChain(origin, entity);
      /*
        // temp revert
        String orginEncoded = UriUtils.encodePath(origin, StandardCharsets.UTF_8);
        ResponseEntity<byte[]> resp = this.restClient.exchange(orginEncoded, HttpMethod.GET, entity, byte[].class);
       */
      HttpHeaders respHeaders = resp.getHeaders();
      String contentType = Utils.getContentTypeFromHeader(respHeaders);
      String contentEncoding = Utils.getContentEncodingFromHeader(respHeaders);
      int status = resp.getStatusCode().value();
      boolean isRedirected = status == 302 || status == 301 || status == 307 || status == 308;
      boolean isValidResponse = status >= 200 && status < 300;
      if (isRedirected) {
        List<String> locations = respHeaders.get(HttpHeaders.LOCATION);
        String redirectTo = "";
        if (locations != null) {
          redirectTo = locations.get(0);
          if (redirectTo == null || redirectTo.isEmpty()) {
            redirectTo = "";
          }
        }
        log.info("Redirecting req for {} with status {} to {}", origin, status, redirectTo);
        if (!redirectTo.isEmpty()) {
          Optional<ParsedReqProxyAsset> redirectProxyAsset = body.updateUrl(redirectTo);
          if (redirectProxyAsset.isEmpty()) {
            log.error("Cant form redirect url {}", redirectTo);
            return RespProxyAsset.WithError(origin);
          } else {
            return createProxyAsset(redirectProxyAsset.get(), ++depth, proxiedAsset);
          }
        } else {
          log.error("Asset returns redirection status {} but location not found", status);
          return RespProxyAsset.WithError(origin);
        }
      } else if (resp.getBody() != null && isValidResponse) {
        String fileName = Utils.createUuidWord();

        byte[] contentBody = resp.getBody();

        // if css then convert the body to string and parse the body for further nested url imports and process those again
        // if not then continue with previous code
        if (contentType.contains("css") && contentEncoding.isEmpty()) {
          String resolvedBody = resolveNestedProxyForCssFile(new String(contentBody), body, ++depth, proxiedAsset);
          contentBody = resolvedBody.getBytes(StandardCharsets.UTF_8);
        }

        // Get the Content-Type information from response and set it directly into the s3 bucket
        Map<String, String> metadata = new HashMap<>(3);
        for (Map.Entry<String, List<String>> h : respHeaders.entrySet()) {
          String headerName = h.getKey();
          if (StringUtils.equalsIgnoreCase(headerName, HttpHeaders.CONTENT_TYPE)) {
            // https://stackoverflow.com/a/50405667
            metadata.put(HttpHeaders.CONTENT_TYPE, contentType);
          } else if (StringUtils.equalsIgnoreCase(headerName, HttpHeaders.CONTENT_ENCODING)) {
            metadata.put(HttpHeaders.CONTENT_ENCODING, contentEncoding);
          }
        }
        metadata.put("Orig-Url", origin);

        AssetFilePath assetFilePath = s3Config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, fileName);
        assetFilePath = s3Service.upload(assetFilePath, contentBody, metadata);

        if (proxiedAsset.containsKey(hashedOrigin)) return proxiedAsset.get(hashedOrigin);

        ProxyAsset asset = ProxyAsset.builder()
          .rid(hashedOrigin)
          .fullOriginUrl(origin)
          .proxyUri(assetFilePath.getFilePath())
          .httpStatus(status)
          .build();

        ProxyAsset savedAsset = proxyAssetRepo.save(asset);
        RespProxyAsset respProxyAsset = RespProxyAsset.from(savedAsset, s3Config);
        if (body.getBody().get()) {
          respProxyAsset.setContent(Optional.of(new String(resp.getBody())));
        }
        proxiedAsset.put(hashedOrigin, respProxyAsset);
        return respProxyAsset;
      } else {
        log.error("Cannot get asset {} . Empty body or not okay status. Status = {}", origin, status);
        return RespProxyAsset.WithError(origin);
      }

    } catch (HttpStatusCodeException ex) {
      log.error("Cannot get asset {} [Status: {}, resp from server: {}]", origin, ex.getStatusCode(), ex.getResponseBodyAsString());
      Sentry.captureException(ex);
      return RespProxyAsset.WithError(origin);
    } catch (Exception ex) {
      log.error("Cannot get asset {} error {}", origin, ex.getMessage());
      Sentry.captureException(ex);
      return RespProxyAsset.WithError(origin);
    }
  }

  @Transactional
  public String resolveNestedProxyForCssFile(String content, ParsedReqProxyAsset body, int depth, Map<String, RespProxyAsset> proxiedAsset) {
    String respbody = content;
    ArrayList<Pair<String, String>> nestedUrls = new ArrayList<>();
    // format of url(...) or url("...") or url('...')
    Pattern urlRegex = Pattern.compile("url\\(\"(.*?)\"\\)|url\\('(.*?)'\\)|url\\((.*?)\\)|@import +[\"'](.*?)[\"']");
    Matcher urlMatcher = urlRegex.matcher(respbody);

    while (urlMatcher.find()) {
      int l = urlMatcher.groupCount();
      String url = "";
      while (l > 0) {
        // the first group is always the full string hence the condition is not >= 0
        if (urlMatcher.group(l) != null) {
          url = urlMatcher.group(l);
          break;
        }
        l--;
      }
      if (StringUtils.isBlank(url)
        || StringUtils.startsWithIgnoreCase(url, "data:")
        || StringUtils.startsWithIgnoreCase(url, "#")) {
        continue;
      }
      url = url.trim();
      nestedUrls.add(Pair.with(url, urlMatcher.group(0)));
    }

    int l = nestedUrls.size();
    log.info("{} nested css found", l);
    int i = 0;
    for (Pair<String, String> urlPair : nestedUrls) {
      String url = urlPair.getValue0();
      String replaceTarget = urlPair.getValue1();
      log.info("Resolving nested css {} {}/{}", url, i++, l);
      Optional<ParsedReqProxyAsset> nestedParsedReqBody = body.updateUrl(url);
      if (nestedParsedReqBody.isEmpty()) continue;
      RespProxyAsset nestedProxyUri = createProxyAsset(nestedParsedReqBody.get(), depth, proxiedAsset);
      if (!StringUtils.isBlank(nestedProxyUri.getProxyUri())) {
        respbody = respbody.replace(replaceTarget,
          StringUtils.startsWithIgnoreCase(replaceTarget, "@import") ? "@import '" + nestedProxyUri.getProxyUri() + "'" : "url(" + nestedProxyUri.getProxyUri() + ")");

      } else {
        log.warn("Can't resolve nested proxy for {}", url);
      }
    }
    return respbody;
  }
}
