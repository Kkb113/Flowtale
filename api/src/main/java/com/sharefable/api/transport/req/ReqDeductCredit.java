package com.sharefable.api.transport.req;

import com.sharefable.api.common.SubscriptionCreditType;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@GenerateTSDef
@NoArgsConstructor
@AllArgsConstructor
public class ReqDeductCredit {
  Integer deductBy;
  SubscriptionCreditType creditType;
}
