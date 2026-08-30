package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TourLeads {
  private String aid;
  private String primaryKey;
  private Object leadFormInfo;
}
