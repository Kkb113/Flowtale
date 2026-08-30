package com.sharefable.analytics.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.analytics.entity.AidRichInfo;
import com.sharefable.analytics.entity.MHouseLead;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HouseLeadWithRichInfo {
  private MHouseLead lead;
  private AidRichInfo info;
}
