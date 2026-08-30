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
@ToString(callSuper = true)
@SuperBuilder(toBuilder = true)
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrgInfo {
  @OptionalPropInTS
  private String[] useCases;
  @OptionalPropInTS
  private String othersText;
  @OptionalPropInTS
  private Object bet; // bet -> [b]ack[e]nd [t]ransparent config; only used in client side
}
