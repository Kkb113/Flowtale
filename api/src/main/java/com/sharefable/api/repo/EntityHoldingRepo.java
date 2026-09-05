package com.sharefable.api.repo;

import com.sharefable.api.entity.EntityHolding;
import org.springframework.data.repository.CrudRepository;
import java.util.Optional;
import com.sharefable.api.transport.EntityType;

public interface EntityHoldingRepo extends CrudRepository<EntityHolding, Long> {
  Optional<EntityHolding> findFirstByEntityTypeAndEntityKeyAndAssetKey(
    EntityType entityType, Long entityKey, String assetKey);
}
