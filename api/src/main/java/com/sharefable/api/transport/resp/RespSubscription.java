package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.SubscriptionInfo;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.entity.Subscription;
import com.sharefable.api.service.SubscriptionService;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import com.sharefable.api.transport.PaymentTerms;
import io.sentry.Sentry;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.sql.Timestamp;
import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@Slf4j
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RespSubscription extends ResponseBase {
  private static final ObjectMapper mapper = new ObjectMapper();
  private PaymentTerms.Plan paymentPlan;
  private PaymentTerms.Interval paymentInterval;
  private com.chargebee.models.Subscription.Status status;
  private Timestamp trialStartedOn;
  private Timestamp trialEndsOn;
  private int availableCredits;
  @OptionalPropInTS
  private SubscriptionInfo info;

  public static RespSubscription from(Subscription subs) {
    try {
      return (RespSubscription) Utils.fromEntityToTransportObject(subs);
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return null;
    }
  }

  public static RespSubscription from(Subscription subs, List<EntityConfigKV> entityConfigKV) {
    RespSubscription resp = from(subs);
    if (resp == null) return null;
    resp.setAvailableCredits(SubscriptionService.computeAvailableCredit(entityConfigKV));
    return resp;
  }
}
