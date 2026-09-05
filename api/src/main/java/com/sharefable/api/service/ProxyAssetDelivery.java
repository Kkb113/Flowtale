package com.sharefable.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.ProxyAssetAccess;
import com.sharefable.api.repo.ProxyAssetAccessRepo;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ProxyAssetDelivery {
  private final ProxyAssetAccessRepo access;
  private final S3Config config;
  private final S3Service storage;

  public S3Service.StoredAsset read(Long org, String key) throws IOException {
    requireAccess(org, key);
    return storage.getAsset(config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, key));
  }

  private void requireAccess(Long org, String key) {
    if (org == null || !key.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")
        || !access.existsById(org + ":" + key)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Captured asset not found");
    }
  }

  private Pattern references() {
    String privatePrefix = config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, "").getS3UriToFile();
    String publicPrefix = AssetFilePath.builder().bucketName(config.getAssetBucketName()).regionName(config.getRegion())
      .cdn(config.getCdn()).publicEndpoint(config.getPublicEndpoint()).fullQualifiedPath(config.getRootQualifier() + "/proxy_asset/")
      .build().getS3UriToFile();
    return Pattern.compile("(?:" + Pattern.quote(privatePrefix) + "|" + Pattern.quote(publicPrefix)
      + ")([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})(?:\\?[^\\s\"'<>)]*)?");
  }

  @Transactional
  public void copyAccess(JsonNode document, Long sourceOrg, Long destinationOrg) throws IOException {
    if (Objects.equals(sourceOrg, destinationOrg)) return;
    var pending = new ArrayDeque<String>();
    var visited = new HashSet<String>();
    pending.add(document.toString());
    int bytes = 0;
    while (!pending.isEmpty()) {
      var matcher = references().matcher(pending.remove());
      while (matcher.find()) {
        String key = matcher.group(1);
        if (!visited.add(key)) continue;
        if (visited.size() > 512) throw new IllegalArgumentException("Captured asset count exceeds the copy limit");
        var asset = read(sourceOrg, key);
        bytes += asset.bytes().length;
        if (bytes > 64 * 1024 * 1024) throw new IllegalArgumentException("Captured assets exceed the copy limit");
        if (asset.contentType().toLowerCase(Locale.ROOT).startsWith("text/css")) pending.add(new String(asset.bytes(), StandardCharsets.UTF_8));
        access.save(new ProxyAssetAccess(destinationOrg + ":" + key));
      }
    }
  }

  /** Copies only surviving playback references into this demo's versioned deletion namespace. */
  public JsonNode publish(JsonNode document, Long org, String demoHash, int version) throws IOException {
    return publish(document, org, demoHash, version, Set.of());
  }

  public JsonNode publish(JsonNode document, Long org, String demoHash, int version, Set<String> blocked) throws IOException {
    return new Publication(org, demoHash, version, blocked).rewrite(document.deepCopy());
  }

  private final class Publication {
    final Long org;
    final String demoHash;
    final int version;
    final Set<String> blocked;
    final Pattern pattern = references();
    final Map<String, String> copied = new HashMap<>();
    int bytes;
    Publication(Long org, String demoHash, int version, Set<String> blocked) {
      this.org = org; this.demoHash = demoHash; this.version = version; this.blocked = blocked;
    }

    JsonNode rewrite(JsonNode node) throws IOException {
      if (node.isTextual()) return TextNode.valueOf(rewriteText(node.textValue()));
      if (node instanceof ObjectNode object) {
        // Original URL lookup tables are authoring metadata; rendering uses resolved attributes.
        object.remove("proxyUrlMap");
        List<String> names = new ArrayList<>();
        object.fieldNames().forEachRemaining(names::add);
        for (String name : names) object.set(name, rewrite(object.get(name)));
      } else if (node instanceof ArrayNode array) {
        for (int i = 0; i < array.size(); i++) array.set(i, rewrite(array.get(i)));
      }
      return node;
    }

    String rewriteText(String text) throws IOException {
      var matcher = pattern.matcher(text);
      var result = new StringBuffer();
      while (matcher.find()) matcher.appendReplacement(result, java.util.regex.Matcher.quoteReplacement(copy(matcher.group(1))));
      matcher.appendTail(result);
      var inline = Pattern.compile("data:image/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+").matcher(result.toString());
      var sanitized = new StringBuffer();
      while (inline.find()) inline.appendReplacement(sanitized, java.util.regex.Matcher.quoteReplacement(
        blocked.contains(DigestUtils.sha256Hex(inline.group())) ? "data:," : inline.group()));
      inline.appendTail(sanitized);
      return sanitized.toString();
    }

    String copy(String key) throws IOException {
      if (blocked.contains(key)) return "data:,";
      if (copied.containsKey(key)) return copied.get(key);
      if (copied.size() >= 512) throw new IllegalArgumentException("Too many captured assets. Split this demo before publishing.");
      S3Service.StoredAsset source;
      try { source = read(org, key); }
      catch (ResponseStatusException missing) {
        throw new IllegalArgumentException("A captured asset is unavailable in this workspace. Recapture the affected screen before publishing.");
      }
      bytes += source.bytes().length;
      if (bytes > 64 * 1024 * 1024) throw new IllegalArgumentException("Captured assets exceed 64 MiB. Split this demo before publishing.");
      var target = config.getQualifiedPathFor(S3Config.AssetType.PublishedTour, "assets-" + demoHash,
        version + "/proxy/" + key);
      copied.put(key, target.getS3UriToFile());
      byte[] content = source.bytes();
      if (source.contentType().toLowerCase(Locale.ROOT).startsWith("text/css")) {
        content = rewriteText(new String(content, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8);
      }
      storage.upload(target, content, Map.of("Content-Type", source.contentType(), "Cache-Control", "max-age=2592000"));
      return target.getS3UriToFile();
    }
  }
}
