package com.sharefable.api.entity;

import com.sharefable.api.common.ConfigEntityType;
import com.sharefable.api.common.EntityConfigConfigType;
import com.sharefable.api.transport.GenerateTSDef;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

/*
 * Usage of this object
 *
 * For subscription management we use this to log lifetime licences that appsumo sends us in the following format
 * orgId = 0 // we used this when a logline is not associated to an org but is associated with fable
 * logType = lifetime_license
 * forObjectType = subscription
 * forObjectId = 0 // na
 * forObjectKey = {{license_key}}
 */

@Entity
@Table(name = "entity_config_kv")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@GenerateTSDef
public class EntityConfigKV extends EntityBase {
  private Long entityId;

  @Enumerated(value = EnumType.STRING)
  private ConfigEntityType entityType;

  private EntityConfigConfigType configType;

  private String configKey;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Object configVal;
}
