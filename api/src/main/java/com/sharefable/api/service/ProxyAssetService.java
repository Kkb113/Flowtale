package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.ProxyAsset;
import com.sharefable.api.repo.ProxyAssetRepo;
import com.sharefable.api.transport.ParsedReqProxyAsset;
import com.sharefable.api.transport.resp.RespProxyAsset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProxyAssetService {
  private final ProxyAssetRepo proxyAssetRepo;
  private final S3Service s3Service;
  private final S3Config s3Config;
  private final SafeAssetFetcher fetcher;
  private final com.sharefable.api.repo.ProxyAssetAccessRepo access;
  private static final Pattern CSS_URL = Pattern.compile(
    "url\\(\\s*(?:\"([^\"]*)\"|'([^']*)'|([^)]*))\\s*\\)|@import\\s+[\"']([^\"']*)[\"']",
    Pattern.CASE_INSENSITIVE);

  private static final class FetchContext {
    final Map<String, RespProxyAsset> visited = new HashMap<>();
    final long deadline = System.nanoTime() + 60_000_000_000L;
    int bytes;
  }

  public RespProxyAsset createProxyAsset(ParsedReqProxyAsset body, Long orgId) {
    if (orgId == null) throw new IllegalArgumentException("An authorized workspace is required");
    return fetch(body, orgId, 0, new FetchContext());
  }

  private RespProxyAsset fetch(ParsedReqProxyAsset body, long orgId, int depth, FetchContext context) {
    // Never reuse the former global URL-only cache. Credentials are request-scoped.
    String key = DigestUtils.sha256Hex(orgId + ":" + body.getOrigin() + ":" + body.getCookie());
    if (context.visited.containsKey(key)) return context.visited.get(key);
    RespProxyAsset failure = RespProxyAsset.WithError("");
    if (depth >= 8 || context.visited.size() >= 64 || System.nanoTime() > context.deadline) return failure;
    context.visited.put(key, failure); // Also breaks cyclic CSS imports.
    try {
      SafeAssetFetcher.validateUrl(body.getOrigin());
      boolean cacheable = body.getCookie() == null || body.getCookie().isBlank();
      if (cacheable) {
        Optional<ProxyAsset> cached = proxyAssetRepo.findProxyAssetByRid(key);
        if (cached.isPresent() && access.existsById(orgId + ":" + cached.get().getProxyUri())) {
          RespProxyAsset response = RespProxyAsset.from(cached.get(), s3Config);
          if (body.getBody().orElse(false)) {
            byte[] bytes = s3Service.getObjectContent(s3Config.getQualifiedPathFor(
              S3Config.AssetType.ProxyAsset, cached.get().getProxyUri()));
            context.bytes += bytes.length;
            if (context.bytes > SafeAssetFetcher.MAX_BYTES) return failure;
            response.setContent(Optional.of(new String(bytes, StandardCharsets.UTF_8)));
          }
          context.visited.put(key, response);
          return response;
        }
      }

      SafeAssetFetcher.Asset remote = fetcher.fetch(body.getOrigin(), body.getCookie(), body.getUserAgent());
      if (Set.of(301, 302, 303, 307, 308).contains(remote.status())) {
        Optional<ParsedReqProxyAsset> redirect = body.updateUrl(remote.location());
        return redirect.map(next -> fetch(next, orgId, depth + 1, context)).orElse(failure);
      }
      if (remote.status() < 200 || remote.status() >= 300 || remote.body().length == 0) return failure;
      context.bytes += remote.body().length;
      if (context.bytes > SafeAssetFetcher.MAX_BYTES) return failure;
      byte[] content = remote.body();
      if (remote.type().toLowerCase(Locale.ROOT).contains("text/css")) {
        content = resolveCss(new String(content, StandardCharsets.UTF_8), body, orgId, depth + 1, context)
          .getBytes(StandardCharsets.UTF_8);
      }
      String fileName = UUID.randomUUID().toString();
      AssetFilePath target = s3Config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, fileName);
      target = s3Service.upload(target, content, Map.of("Content-Type", remote.type()));
      access.save(new com.sharefable.api.entity.ProxyAssetAccess(orgId + ":" + fileName));
      ProxyAsset asset = ProxyAsset.builder().rid(key).fullOriginUrl("")
        .proxyUri(target.getFilePath()).httpStatus(remote.status()).build();
      if (cacheable) {
        // Retain the existing cache identity when replacing a pre-migration entry.
        var previous = proxyAssetRepo.findProxyAssetByRid(key);
        if (previous.isPresent()) asset.setId(previous.get().getId());
        asset = proxyAssetRepo.save(asset);
      }
      RespProxyAsset response = RespProxyAsset.from(target.getS3UriToFile());
      if (body.getBody().orElse(false)) response.setContent(Optional.of(new String(content, StandardCharsets.UTF_8)));
      context.visited.put(key, response);
      return response;
    } catch (Exception error) {
      // Remote URLs, headers, response bodies and exception messages can contain secrets.
      log.warn("Asset proxy failed for workspace {} ({})", orgId, error.getClass().getSimpleName());
      return failure;
    }
  }

  private String resolveCss(String css, ParsedReqProxyAsset body, long orgId, int depth, FetchContext context) {
    Matcher matcher = CSS_URL.matcher(css);
    StringBuffer result = new StringBuffer();
    while (matcher.find()) {
      String url = "";
      for (int i = 1; i <= matcher.groupCount(); i++) if (matcher.group(i) != null) url = matcher.group(i).trim();
      if (url.isEmpty() || url.startsWith("#") || url.toLowerCase(Locale.ROOT).startsWith("data:")) continue;
      Optional<ParsedReqProxyAsset> nested = body.updateUrl(url);
      RespProxyAsset asset = nested.map(next -> fetch(next, orgId, depth, context)).orElse(RespProxyAsset.WithError(""));
      // A failed nested fetch must not make the viewer retry an unsafe original URL.
      String replacement = asset.getProxyUri().isBlank() ? "data:," : asset.getProxyUri();
      matcher.appendReplacement(result, Matcher.quoteReplacement(matcher.group().toLowerCase(Locale.ROOT).startsWith("@import")
        ? "@import '" + replacement + "'" : "url('" + replacement + "')"));
    }
    matcher.appendTail(result);
    return result.toString();
  }
}
