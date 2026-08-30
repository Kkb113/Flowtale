package com.sharefable.analytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "entity_metrics", schema = "al")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class MEntityMetrics {
  @Column(name = "enc_entity_id")
  @Id
  private Long entityId;

  private Long viewsUnique;
  private Long viewsAll;

  @Column(name = "abs_conversion")
  private Long conversion;
}
