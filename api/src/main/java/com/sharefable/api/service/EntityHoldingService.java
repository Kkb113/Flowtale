package com.sharefable.api.service;

import com.sharefable.api.entity.EntityBaseWithReadableId;
import com.sharefable.api.entity.EntityBaseWithOwnership;
import com.sharefable.api.entity.User;
import com.sharefable.api.entity.EntityHolding;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.EntityHoldingRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.EntityHoldingInfoBase;
import com.sharefable.api.transport.EntityType;
import com.sharefable.api.transport.req.ReqEntityAssetAssn;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Objects;
import java.util.Arrays;
import java.util.stream.Stream;
import com.sharefable.api.transport.MediaTypeEntityHolding;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.entity.DemoEntity;

@Service
@Slf4j
public class EntityHoldingService {
  private final DemoEntityRepo demoEntityRepo;

  private final ScreenRepo screenRepo;

  private final EntityHoldingRepo entityHoldingRepo;

  public EntityHoldingService(DemoEntityRepo demoEntityRepo, ScreenRepo screenRepo, EntityHoldingRepo entityHoldingRepo) {
    this.demoEntityRepo = demoEntityRepo;
    this.screenRepo = screenRepo;
    this.entityHoldingRepo = entityHoldingRepo;
  }

  EntityHolding addAssociation(ReqEntityAssetAssn body, String assetKey, EntityHoldingInfoBase info) {
    Optional<? extends EntityBaseWithReadableId> maybeEntity;
    if (body.getEntityType() == EntityType.Screen) {
      maybeEntity = screenRepo.findByRid(body.getEntityRid());
    } else if (body.getEntityType() == EntityType.Tour) {
      maybeEntity = demoEntityRepo.findByRid(body.getEntityRid());
    } else {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No association is mentioned");
    }

    if (maybeEntity.isEmpty()) {
      log.error("Media processing is requested without explicit association with entity. Entity type {}, Entity rid {}",
        body.getEntityType().name(),
        body.getEntityRid());
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No association is mentioned");
    }

    var existing = entityHoldingRepo.findFirstByEntityTypeAndEntityKeyAndAssetKey(
      body.getEntityType(), maybeEntity.get().getId(), assetKey);
    if (existing.isPresent()) {
      EntityHolding holding = existing.get();
      if (holding.getInfo() instanceof MediaTypeEntityHolding saved && info instanceof MediaTypeEntityHolding incoming) {
        saved.setFullFilePaths(Stream.concat(Arrays.stream(saved.getFullFilePaths()),
          Arrays.stream(incoming.getFullFilePaths())).distinct().toArray(String[]::new));
        return entityHoldingRepo.save(holding);
      }
      return holding;
    }
    EntityHolding entityHolding = EntityHolding.builder()
      .entityType(body.getEntityType())
      .entityKey(maybeEntity.get().getId())
      .assetKey(assetKey)
      .info(info)
      .build();

    return entityHoldingRepo.save(entityHolding);
  }

  public void validateOwnership(ReqEntityAssetAssn body, User user) {
    if (body == null || body.getEntityType() == null || body.getEntityRid() == null
        || user == null || user.getBelongsToOrg() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An owned media destination is required");
    }
    Optional<? extends EntityBaseWithOwnership> entity = switch (body.getEntityType()) {
      case Screen -> screenRepo.findByRid(body.getEntityRid());
      case Tour -> demoEntityRepo.findByRid(body.getEntityRid());
      default -> Optional.empty();
    };
    if (entity.isEmpty() || !Objects.equals(entity.get().getBelongsToOrg(), user.getBelongsToOrg())
        || entity.get() instanceof DemoEntity demo && demo.getDeleted() != TourDeleted.ACTIVE) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media destination not found");
    }
  }
}
