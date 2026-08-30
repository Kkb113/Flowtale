package com.sharefable.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class SubscriptionInfo {
  @OptionalPropInTS
  private boolean soloPlanDowngradeIntentReceived;
}
