package com.sharefable.api.repo;

import com.sharefable.api.entity.PlatformIntegration;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformIntegrationRepo extends CrudRepository<PlatformIntegration, Long> {
}
