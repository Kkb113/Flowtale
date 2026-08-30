package com.sharefable.analytics.entity;

import com.sharefable.api.entity.EntityBase;
import com.sharefable.api.transport.GenerateTSDef;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "entity_subentity_distribution", schema = "al")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@GenerateTSDef
public class MEntitySubEntityDistribution extends EntityBase {
  @Column(name = "enc_entity_id")
  private Long entityId;

  private String subEntityType;

  private String subEntityId;

  private Integer bucketNumber;

  private Long metric0;

  private Integer bucketMin;

  private Long bucketMax;

  private Integer bucketCount;

  private Long freq;
}
