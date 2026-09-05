package com.sharefable.api.service;

import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.TourDeleted;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.Objects;
import java.util.Set;

/** Authorize the resource before resolving any storage key. No caller-selected bucket/key is accepted. */
@Service
@RequiredArgsConstructor
public class DraftAssetService {
  private final DemoEntityRepo demos;
  private final ScreenRepo screens;
  private final S3Config config;
  private final S3Service storage;

  @Transactional(readOnly = true)
  public byte[] read(String kind, String rid, String filename, User user) {
    if (user.getBelongsToOrg() == null) throw notFound();
    S3Config.AssetType type;
    String prefix;
    if (kind.equals("screen")) {
      if (!Set.of("index.json", "edits.json", "index.img").contains(filename)) throw notFound();
      var screen = screens.findByRid(rid)
        .filter(value -> Objects.equals(value.getBelongsToOrg(), user.getBelongsToOrg())).orElseThrow(this::notFound);
      if (filename.equals("index.img") && screen.getType() != com.sharefable.api.transport.ScreenType.Img) throw notFound();
      type = S3Config.AssetType.Screen;
      prefix = screen.getAssetPrefixHash();
    } else if (kind.equals("tour") || kind.equals("hub")) {
      if (!(kind.equals("tour") ? Set.of("index.json", "edits.json", "loader.json") : Set.of("index.json"))
          .contains(filename)) throw notFound();
      var entityType = kind.equals("tour") ? TopLevelEntityType.TOUR : TopLevelEntityType.DEMO_HUB;
      var demo = demos.findByRid(rid).filter(value -> value.getDeleted() == TourDeleted.ACTIVE
        && value.getEntityType() == entityType && Objects.equals(value.getBelongsToOrg(), user.getBelongsToOrg()))
        .orElseThrow(this::notFound);
      type = kind.equals("tour") ? S3Config.AssetType.Tour : S3Config.AssetType.DemoHub;
      prefix = demo.getAssetPrefixHash();
    } else throw notFound();
    try {
      return storage.getObjectContent(config.getQualifiedPathFor(type, prefix, filename));
    } catch (AmazonS3Exception error) {
      if (error.getStatusCode() == 404) throw notFound();
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Draft storage is unavailable. Retry shortly.");
    } catch (IOException error) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The draft could not be read. Retry shortly.");
    }
  }

  private ResponseStatusException notFound() {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft asset not found");
  }
}
