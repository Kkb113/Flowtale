package com.sharefable.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.entity.Subscription;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubscriptionWithCredit {
  private Subscription subscription;
  private EntityConfigKV entityConfigKV;
}
