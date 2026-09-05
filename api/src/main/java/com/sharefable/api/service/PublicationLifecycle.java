package com.sharefable.api.service;

import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Publication-owned cleanup. Callers hold the demo row lock throughout the operation. */
@Service
public class PublicationLifecycle {
  private static final ObjectMapper JSON = new ObjectMapper();
  private final S3Service storage;
  private final S3Config config;
  private final PublicationCacheInvalidator cache;

  public PublicationLifecycle(S3Service storage, S3Config config, PublicationCacheInvalidator cache) {
    this.storage = storage;
    this.config = config;
    this.cache = cache;
  }

  private S3Config.AssetType dataType(DemoEntity demo) {
    return demo.getEntityType() == TopLevelEntityType.TOUR ? S3Config.AssetType.Tour : S3Config.AssetType.DemoHub;
  }

  private S3Config.AssetType publicType(DemoEntity demo) {
    return demo.getEntityType() == TopLevelEntityType.TOUR ? S3Config.AssetType.PublishedTour : S3Config.AssetType.PublishedDemoHub;
  }

  private AssetFilePath registry(DemoEntity demo) {
    return config.getQualifiedPathFor(dataType(demo), segment(demo.getAssetPrefixHash()), "publication-aliases.json");
  }

  private static String segment(String value) {
    if (value == null || !value.matches("[A-Za-z0-9_-]+")) throw new IllegalArgumentException("Invalid publication identity");
    return value;
  }

  private Set<String> aliases(DemoEntity demo) throws IOException {
    try {
      var document = JSON.readTree(storage.getObjectContent(registry(demo)));
      if (!document.isArray()) throw new IOException("Invalid publication alias registry");
      Set<String> aliases = new LinkedHashSet<>();
      for (var alias : document) aliases.add(segment(alias.asText()));
      return aliases;
    } catch (AmazonS3Exception error) {
      if (error.getStatusCode() != 404) throw error;
      if (demo.getLastPublishedDate() != null) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Publication storage migration is required before changing this published demo");
      }
      return new LinkedHashSet<>();
    }
  }

  /** Record before any public write, so even a failed SQL transaction has tracked aliases. */
  public void track(DemoEntity demo, String... names) {
    try {
      Set<String> aliases = aliases(demo);
      for (String name : names) aliases.add(segment(name));
      storage.upload(registry(demo), JSON.writeValueAsBytes(aliases),
        Map.of(HttpHeaders.CONTENT_TYPE, "application/json", HttpHeaders.CACHE_CONTROL, "no-store"));
    } catch (IOException error) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Publication aliases could not be saved; retry", error);
    }
  }

  public void remove(DemoEntity demo) {
    cache.requireConfigured();
    try {
      Set<String> aliases = aliases(demo);
      aliases.add(segment(demo.getRid()));
      List<AssetFilePath> prefixes = new ArrayList<>();
      for (String alias : aliases) prefixes.add(config.getQualifiedPathFor(publicType(demo), alias, ""));
      prefixes.add(config.getQualifiedPathFor(dataType(demo), segment(demo.getAssetPrefixHash()), ""));
      if (demo.getEntityType() == TopLevelEntityType.TOUR) {
        prefixes.add(config.getQualifiedPathFor(S3Config.AssetType.PublishedTour, "assets-" + segment(demo.getAssetPrefixHash()), ""));
      }
      // Private drafts, source screens and shared media are intentionally outside these prefixes.
      for (AssetFilePath prefix : prefixes) storage.deletePrefix(prefix);
      cache.invalidate(prefixes.stream().map(path -> "/" + path.getFullQualifiedPath() + "*").toList());
    } catch (IOException error) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Published files could not be removed; retry deletion", error);
    }
  }
}
