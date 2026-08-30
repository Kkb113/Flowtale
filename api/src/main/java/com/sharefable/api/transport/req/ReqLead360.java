package com.sharefable.api.transport.req;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class ReqLead360 {
  private Long tourId;
  private Integer demoVisited;
  private Integer sessionsCreated;
  private Integer timeSpentSec;
  private Timestamp lastInteractedAt;
  private Integer completionPercentage;
  private Double ctaClickRate;
}