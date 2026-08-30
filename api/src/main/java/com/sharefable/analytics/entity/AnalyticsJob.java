package com.sharefable.analytics.entity;

import com.sharefable.analytics.common.AnalyticsJobType;
import com.sharefable.analytics.common.ProcessingStatus;
import com.sharefable.api.transport.GenerateTSDef;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "job", schema = "al")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Builder
@GenerateTSDef
public class AnalyticsJob {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(updatable = false, nullable = false)
  private Long id;

  @CreationTimestamp
  private Timestamp createdAt;

  @UpdateTimestamp
  private Timestamp updatedAt;

  @Enumerated(value = EnumType.STRING)
  private AnalyticsJobType jobType;

  private String jobKey;

  @Enumerated(value = EnumType.STRING)
  private ProcessingStatus jobStatus;

  private Timestamp lowWatermark;

  private Timestamp highWatermark;

  private String failureReason;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Object jobData;
}
