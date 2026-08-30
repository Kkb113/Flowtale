package com.sharefable.api.service;

import com.sharefable.api.common.ConfigEntityType;
import com.sharefable.api.common.EntityConfigConfigType;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.repo.EntityConfigKVRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class EntityConfigService {

  private final EntityConfigKVRepo entityConfigKVRepo;

  @Transactional(readOnly = true)
  public EntityConfigKV getEntityConfig(ConfigEntityType configEntityType, Long entityId, EntityConfigConfigType configType) {
    List<EntityConfigKV> entityConfigType = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(configEntityType, entityId, configType);
    if (entityConfigType.isEmpty()) {
      log.warn("No Global opts is found to update global opts");
      return null;
    }
    return entityConfigType.get(0);
  }

  @Transactional(readOnly = true)
  public List<EntityConfigKV> getEntityConfigForAnOrg(ConfigEntityType configEntityType, Long entityId, Set<EntityConfigConfigType> entityConfigConfigTypes) {
    return entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeIn(configEntityType, entityId, entityConfigConfigTypes);
  }
}
