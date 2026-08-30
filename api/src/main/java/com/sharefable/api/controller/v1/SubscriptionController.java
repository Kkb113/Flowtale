package com.sharefable.api.controller.v1;

import com.chargebee.models.Event;
import com.chargebee.models.Subscription;
import com.sharefable.Routes;
import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.PaymentConfig;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.SubscriptionService;
import com.sharefable.api.transport.PaymentTerms;
import com.sharefable.api.transport.req.ReqDeductCredit;
import com.sharefable.api.transport.req.ReqSubscriptionInfo;
import com.sharefable.api.transport.req.ReqUpdateSubInfo;
import com.sharefable.api.transport.resp.RespSubsValidation;
import com.sharefable.api.transport.resp.RespSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class SubscriptionController {
  private final SubscriptionService subsService;
  private final PaymentConfig paymentConfig;
  private final AppSettings appSettings;

  @RequestMapping(value = Routes.CHECKOUT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> createOrUpdateSubscription(@RequestBody ReqSubscriptionInfo subsInfo, @AuthUser User user) {
    ReqSubscriptionInfo info = subsInfo.normalize();
    RespSubscription subs = subsService.getSubscriptionForUser(user);
    if (subs == null) {
      subs = subsService.newSubscription(info, user);
    } else {
      subs = subsService.updateSubscriptionForUser(info, user);
    }
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(subs).build();
  }

  @RequestMapping(value = Routes.GET_SUBSCRIPTION, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> getSubscription(@AuthUser User user) {
    RespSubscription subs = subsService.getSubscriptionForUser(user);
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(subs).build();
  }

  @RequestMapping(value = Routes.VALIDATE_SUBSCRIPTION_FOR_UPGRADE_OR_DOWNGRADE, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubsValidation> validateSubscription(@AuthUser User user) {
    RespSubsValidation validationResult = subsService.validate(user.getBelongsToOrg());
    return ApiResp.<RespSubsValidation>builder().status(ApiResp.ResponseStatus.Success).data(validationResult).build();
  }

  @RequestMapping(value = Routes.GEN_CHECKOUT_URL, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public String generateCheckoutUrl(@AuthUser User user, @RequestBody Optional<ReqSubscriptionInfo> info) {
    return subsService.createHostedPage(user, info);
  }

  @RequestMapping(value = Routes.GEN_AI_CREDIT_CHECKOUT_URL, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public String generateCheckoutUrl(@AuthUser User user) {
    return subsService.createHostedPageForAiCredit(user);
  }

  @RequestMapping(value = Routes.CHARGEBEE_WEBHOOK, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<?> handleWebhook(@RequestBody String payload) {
    Event event = new Event(payload);
    log.warn("Subscription event {}", event.eventType());
    switch (event.eventType()) {
      case SUBSCRIPTION_ACTIVATED, SUBSCRIPTION_REACTIVATED, SUBSCRIPTION_CHANGED, SUBSCRIPTION_PAUSED,
           SUBSCRIPTION_RESUMED, SUBSCRIPTION_RENEWED, SUBSCRIPTION_CANCELLED, SUBSCRIPTION_TRIAL_EXTENDED -> {
        Subscription subs = event.content().subscription();
        log.warn("Subscription id {} with eventType {}", subs.id(), event.eventType());
        com.chargebee.models.Subscription.SubscriptionItem subscriptionItem = subs.subscriptionItems().get(0);
        if ((subs.status() == Subscription.Status.CANCELLED
          || subs.status() == Subscription.Status.NON_RENEWING
          || subs.status() == Subscription.Status.PAUSED
          || subs.status() == Subscription.Status._UNKNOWN
        ) && !(
          StringUtils.equalsIgnoreCase(subscriptionItem.itemPriceId(), paymentConfig.getPlanId(PaymentTerms.Plan.SOLO, PaymentTerms.Interval.MONTHLY))
            || StringUtils.equalsIgnoreCase(subscriptionItem.itemPriceId(), paymentConfig.getPlanId(PaymentTerms.Plan.SOLO, PaymentTerms.Interval.YEARLY))
        )) {
          // when paid subscription with trial gets over, we automatically downgrade to the free plan
          // In order to restart the trial, from chargebee, cancel the free subscription first, then edit
          // the subscription to change the plan and trial
          log.info("Downgrading subscription because current status = {} & current plan = {}", subs.status(), subscriptionItem.itemPriceId());
          subsService.downgradeSubscriptionToFreePlan(subs);
        }
        subsService.resyncSubscription(subs, event.eventType());
      }
      case SUBSCRIPTION_TRIAL_END_REMINDER, PAYMENT_FAILED, PAYMENT_SUCCEEDED, PAYMENT_INITIATED,
           SUBSCRIPTION_RENEWAL_REMINDER -> subsService.checkEventAndTopupCredit(event);

      default -> log.warn("No handler present for chargebee webhook {}", event.eventType());
    }

    return ResponseEntity.ok().build();
  }

  @RequestMapping(value = Routes.DEDUCT_CREDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> deductCredit(@RequestBody ReqDeductCredit req, @AuthUser User user) {
    RespSubscription subs = subsService.updateCreditAfterDeduction(req, user);
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(subs).build();
  }

  @RequestMapping(value = Routes.REFILL_FABLE_CREDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> refillFableCredit(@PathVariable("org_id") Long orgId) {
    if (!appSettings.isDataEntryFlagSet()) {
      log.error("Data entry requested but flag not set but REFILL_FABLE_CREDIT for {} is requested.", orgId);
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }
    RespSubscription subs = subsService.resetCreditUsage(orgId);
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(subs).build();
  }

  @RequestMapping(value = Routes.MIGRATE_FABLE_CREDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> migrateFableCredit(@PathVariable("org_id") Long orgId) {
    if (!appSettings.isDataEntryFlagSet()) {
      log.error("Data entry requested but flag not set but REFILL_FABLE_CREDIT for {} is requested.", orgId);
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }
    RespSubscription subs = subsService.migrateFableCredit(orgId);
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(subs).build();
  }

  @RequestMapping(value = Routes.UPDATE_SUBS_PROPS, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespSubscription> updateOrgProps(@RequestBody ReqUpdateSubInfo req, @AuthUser User user) {
    RespSubscription respSubs = subsService.updateSubsInfo(req, user);
    return ApiResp.<RespSubscription>builder().status(ApiResp.ResponseStatus.Success).data(respSubs).build();
  }

}
