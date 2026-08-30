package com.sharefable.api.transport;

import com.sharefable.analytics.transport.RespHouseLead;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@GenerateTSDef
public class RespAggregateLeadAnalytics {
  private Integer noOfDemos;
  private List<RespHouseLead> leads;
}
