package com.sharefable.api.entity;

import com.sharefable.api.common.ForObjectType;
import com.sharefable.api.common.LogType;
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
@Table(name = "logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class Log extends EntityBase {
  private Long orgId;

  @Enumerated(value = EnumType.STRING)
  private LogType logType;

  @Enumerated(value = EnumType.STRING)
  private ForObjectType forObjectType;

  private Long forObjectId;

  private String forObjectKey;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Object logLine;
}
