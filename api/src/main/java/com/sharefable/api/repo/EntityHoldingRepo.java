package com.sharefable.api.repo;

import com.sharefable.api.entity.EntityHolding;
import org.springframework.data.repository.CrudRepository;

public interface EntityHoldingRepo extends CrudRepository<EntityHolding, Long> {
}
