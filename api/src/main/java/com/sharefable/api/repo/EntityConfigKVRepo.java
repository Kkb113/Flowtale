package com.sharefable.api.repo;

import com.sharefable.api.common.ConfigEntityType;
import com.sharefable.api.common.EntityConfigConfigType;
import com.sharefable.api.entity.EntityConfigKV;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface EntityConfigKVRepo extends CrudRepository<EntityConfigKV, Long> {
  List<EntityConfigKV> findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(
    ConfigEntityType entityType,
    Long entityId,
    EntityConfigConfigType configType
  );

  List<EntityConfigKV> findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
    ConfigEntityType entityType,
    Long entityId,
    EntityConfigConfigType configType,
    String configKey
  );

  List<EntityConfigKV> findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKeyIn(
    ConfigEntityType entityType,
    Long entityId,
    EntityConfigConfigType configType,
    Set<String> configKey
  );

  List<EntityConfigKV> findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeIn(
    ConfigEntityType entityType,
    Long entityId,
    Set<EntityConfigConfigType> configType
  );

  void deleteEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
    ConfigEntityType entityType,
    Long entityId,
    EntityConfigConfigType configType,
    String configKey);
}
