package com.sharefable.api.transport.req;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class ReqHouseLeadInfoWithInfo360 {
  private Long orgId;
  private String leadEmailId;
  private List<ReqLead360> info360;
}
