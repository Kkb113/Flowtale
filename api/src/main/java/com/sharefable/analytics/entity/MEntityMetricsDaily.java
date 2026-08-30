package com.sharefable.analytics.entity;

import com.sharefable.api.entity.EntityBase;
import com.sharefable.api.transport.GenerateTSDef;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.sql.Timestamp;

@Entity
@Table(name = "entity_metrics_daily", schema = "al")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@GenerateTSDef
public class MEntityMetricsDaily extends EntityBase {
  @Column(name = "enc_entity_id")
  private Long entityId;

  private Long viewsAll;

  @Column(name = "abs_conversion")
  private Long conversion;

  private Timestamp day;
}
