package com.sharefable.api.service;

import com.chargebee.Result;
import com.chargebee.models.Customer;
import com.chargebee.models.Event;
import com.chargebee.models.HostedPage;
import com.chargebee.models.Invoice;
import com.chargebee.models.enums.EventType;
import com.chargebee.org.json.JSONObject;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.*;
import com.sharefable.api.config.PaymentConfig;
import com.sharefable.api.entity.*;
import com.sharefable.api.repo.EntityConfigKVRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.SubscriptionRepo;
import com.sharefable.api.service.vendor.SlackMsgService;
import com.sharefable.api.transport.NfEvents;
import com.sharefable.api.transport.PaymentTerms;
import com.sharefable.api.transport.req.ReqDeductCredit;
import com.sharefable.api.transport.req.ReqSubscriptionInfo;
import com.sharefable.api.transport.req.ReqUpdateSubInfo;
import com.sharefable.api.transport.resp.RespSubsValidation;
import com.sharefable.api.transport.resp.RespSubscription;
import io.sentry.Sentry;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.javatuples.Pair;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class SubscriptionService {
  private static final ObjectMapper mapper = new ObjectMapper();
  private static final String FABLE_GIVEN_CREDIT = "FABLE_GIVEN_CREDIT";
  private static final String TOPUP_CREDIT = "TOPUP_CREDIT";
  private static final String CREDIT_USED = "CREDIT_USED";
  private static final int CREDIT_SCALED_BY = 10;
  private final SubscriptionRepo repo;
  private final PaymentConfig paymentConfig;
  private final OrgService orgService;
  private final OrgRepo orgRepo;
  private final LogService logService;
  private final SlackMsgService slackMsgService;
  private final NfHookService nfHookService;
  private final EntityConfigKVRepo entityConfigKVRepo;
  private final QMsgService qMsgService;


  public static int computeAvailableCredit(List<EntityConfigKV> entityConfigKV) {
    int totalCredit = 0;
    int usedCredit = 0;
    for (EntityConfigKV configKV : entityConfigKV) {
      CreditInfo info = mapper.convertValue(configKV.getConfigVal(), CreditInfo.class);
      if (StringUtils.equalsIgnoreCase(FABLE_GIVEN_CREDIT, configKV.getConfigKey())) totalCredit += info.getValue();
      else if (StringUtils.equalsIgnoreCase(TOPUP_CREDIT, configKV.getConfigKey())) totalCredit += info.getValue();
      else if (StringUtils.equalsIgnoreCase(CREDIT_USED, configKV.getConfigKey())) usedCredit += info.getValue();
    }

    return Math.max(0, totalCredit - usedCredit);
  }

  @Transactional
  public Pair<Subscription, List<EntityConfigKV>> getSubscriptionCreditPairForUser(User user) {
    Long orgId = user.getBelongsToOrg();
    if (orgId == null) return null;
    Optional<Org> maybeOrg = orgRepo.findById(orgId);
    if (maybeOrg.isEmpty()) return null;

    Pair<Subscription, List<EntityConfigKV>> subscriptionAndCredits = getSubscriptionWithCreditInfo(orgId);
    Subscription subs = subscriptionAndCredits.getValue0();
    List<EntityConfigKV> entityConfigKVS = subscriptionAndCredits.getValue1();

    return Pair.with(subs, entityConfigKVS);
  }

  @Transactional
  public RespSubscription getSubscriptionForUser(User user) {
    Pair<Subscription, List<EntityConfigKV>> pair = getSubscriptionCreditPairForUser(user);
    if (pair == null) return null;

    Subscription subs = pair.getValue0();
    List<EntityConfigKV> entityConfigKVS = pair.getValue1();

    if (subs == null) return null;
    return RespSubscription.from(subs, entityConfigKVS);
  }

  @Transactional
  public RespSubscription newSubscription(ReqSubscriptionInfo info, User user) {
    if (user.getBelongsToOrg() == null) return null;
    Optional<Org> maybeOrg = orgRepo.findById(user.getBelongsToOrg());
    if (maybeOrg.isEmpty()) return null;
    Org org = maybeOrg.get();

    String planId = paymentConfig.getPlanId(info.pricingPlan(), info.pricingInterval());
    List<EntityConfigKV> entityConfigKVS;

    if (info.pricingInterval() == PaymentTerms.Interval.LIFETIME && !StringUtils.isBlank(info.lifetimeLicense())) {
      // process lifetime license from appsumo, in this case we don't process saas pricing at all (chargebee)

      // appsumo sends a webhook on license activate / deactivate / purchase / upgrade / downgrade
      // when it does that, we save the data to logs table
      // When user logs in after that we fetch the license information and populate the subscription table
      // There might be a very little edge case when user logs in but the license information is not passed via webhook
      // or may be the webhook failed. In that case we use status Future

      Optional<Log> license = logService.getLicenseFromLog(info.lifetimeLicense());
      Subscription.SubscriptionBuilder<?, ?> builder = Subscription.builder()
        .paymentInterval(PaymentTerms.Interval.LIFETIME)
        .cbSubscriptionId(info.lifetimeLicense())
        .trialEndsOn(Timestamp.from(Instant.ofEpochMilli(1893436200000L))) // static value 2030
        .trialStartedOn(Timestamp.from(Instant.ofEpochMilli(1893436200000L))) // static value 2030
        .cbCustomerId("")
        .managedBy(SubscriptionManagedBy.APPSUMO)
        .orgId(org.getId());

      boolean isDeactivated = false;
      if (license.isPresent()) {
        Object logLine = license.get().getLogLine();
        Map<String, Object> licenseInfo = (Map<String, Object>) logLine;

        String event = (String) licenseInfo.get("event");
        if (StringUtils.equalsIgnoreCase(event, "deactivate")) {
          isDeactivated = true;
        } else {
          Object rawTier = licenseInfo.get("tier");
          int tier = 1;
          if (rawTier != null) {
            tier = (Integer) rawTier;
          }
          PaymentTerms.Plan plan = switch (tier) {
            case 2 -> PaymentTerms.Plan.LIFETIME_TIER2;
            case 3 -> PaymentTerms.Plan.LIFETIME_TIER3;
            case 4 -> PaymentTerms.Plan.LIFETIME_TIER4;
            case 5 -> PaymentTerms.Plan.LIFETIME_TIER5;
            // case 1
            default -> PaymentTerms.Plan.LIFETIME_TIER1;
          };
          planId = paymentConfig.getPlanId(plan, info.pricingInterval());

          builder
            .paymentPlanId(planId)
            .paymentPlan(plan)
            .status(com.chargebee.models.Subscription.Status.ACTIVE);
        }
      } else {
        builder
          .paymentPlanId(planId)
          .paymentPlan(info.pricingPlan())
          .status(com.chargebee.models.Subscription.Status.FUTURE);
      }

      // If license is deactivated start saas plan without breaking the flow
      // if license is active then create appsumo subscription activation
      if (!isDeactivated) {
        Subscription subs = builder.build();
        repo.save(subs);
        entityConfigKVS = setCreditsForOrg(subs, 1);
        sendUserDetailsWithPlans(user, subs);
        return RespSubscription.from(subs, entityConfigKVS);
      }
    }

    try {
      final int numberOfMembersInOrg = orgService.getCountOfActiveUsersInOrg(org.getId());

      // Create a customer object in chargebee
      Result cusomerResult = Customer.create()
        .firstName(user.getFirstName())
        .lastName(user.getLastName())
        .email(user.getEmail())
        .company(org.getDisplayName())
        .request();
      Customer customer = cusomerResult.customer();

      // Create a subscription object in chargebee
      Result subsResult = com.chargebee.models.Subscription.createWithItems(customer.id())
        .subscriptionItemItemPriceId(0, planId)
        .subscriptionItemQuantity(0, numberOfMembersInOrg)
        .request();
      com.chargebee.models.Subscription cbSubs = subsResult.subscription();

      Subscription subs = Subscription.builder()
        .paymentPlanId(planId)
        .paymentPlan(info.pricingPlan())
        .paymentInterval(info.pricingInterval())
        .cbSubscriptionId(cbSubs.id())
        .trialEndsOn(cbSubs.trialEnd())
        .trialStartedOn(cbSubs.trialStart())
        .managedBy(SubscriptionManagedBy.CHARGEBEE)
        .status(cbSubs.status())
        .orgId(org.getId())
        .cbCustomerId(customer.id())
        .build();

      repo.save(subs);
      entityConfigKVS = setCreditsForOrg(subs, numberOfMembersInOrg);
      sendUserDetailsWithPlans(user, subs);

      return RespSubscription.from(subs, entityConfigKVS);
    } catch (Exception e) {
      log.error("Can't create account subscription for user {}.  Error: {}", user.getEmail(), e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while creating subscription");
    }
  }

  @Transactional
  public RespSubscription updateSubscription(ReqSubscriptionInfo info, Long orgId) {
    return updateSubscription(info, orgService.getOrgOwner(orgId));
  }

  @Transactional
  public RespSubscription updateSubscription(ReqSubscriptionInfo info, User user) {
    val orgId = user.getBelongsToOrg();
    Subscription subs = repo.getSubscriptionByOrgId(orgId);

    // If subscription purchased, upgraded, downgraded update it
    // if it's deactivated start a new chargebee subscription
    // delete existing chargebee subscription

    String planId = paymentConfig.getPlanId(info.pricingPlan(), info.pricingInterval());
    final int numberOfMembersInOrg = orgService.getCountOfActiveUsersInOrg(orgId);

    boolean isLifetimeSubscription = info.pricingInterval() == PaymentTerms.Interval.LIFETIME &&
      !StringUtils.isBlank(info.lifetimeLicense());
    Map<String, Object> licenseInfo;
    if (isLifetimeSubscription) {
      Optional<Log> license = logService.getLicenseFromLog(info.lifetimeLicense());
      if (license.isPresent()) {
        licenseInfo = (Map<String, Object>) license.get().getLogLine();
        String event = (String) licenseInfo.get("event");
        if (StringUtils.equalsIgnoreCase(event, "deactivate")) {
          // If the license got deactivated then make lifetime subscription as false
          isLifetimeSubscription = false;
        }

        try {
          slackMsgService.sendAppSumoSubsMsgs(
            Map.of(
              "__st", "ASSOCIATION",
              "email", user.getEmail(),
              "EVENT", event,
              "licenseInfo", licenseInfo
            )
          );
        } catch (Exception e) {
          log.error("Couldn't send message to slack", e);
          Sentry.captureException(e);
        }
      } else {
        throw new RuntimeException("License " + info.lifetimeLicense() + " should be present for user");
      }
    }

    try {
      if (isLifetimeSubscription) {
        if (subs.getManagedBy() == SubscriptionManagedBy.CHARGEBEE || subs.getManagedBy() == SubscriptionManagedBy.APPSUMO) {
          // If user is choosing saas -> lifetime
          // if upgrading / downgrading lifetime
          repo.delete(subs);
          return newSubscription(info, user);
        } else {
          throw new RuntimeException("Unknown subscription manager " + subs.getManagedBy());
        }
      } else {
        if (subs.getManagedBy() == SubscriptionManagedBy.APPSUMO) {
          // if switching from appsumo to saas. this happens when someone activates saas plan from app sumo plan
          // 1. delete app sumo subscription
          // 2. start a new saas subscription
          repo.delete(subs);
          return newSubscription(
            new ReqSubscriptionInfo(
              PaymentTerms.Plan.SOLO,
              PaymentTerms.Interval.MONTHLY,
              null
            ), user);
        } else if (subs.getManagedBy() == SubscriptionManagedBy.CHARGEBEE) {
          // saas upgrade / downgrade
          PaymentTerms.Plan beforePlan = subs.getPaymentPlan();

          com.chargebee.models.Subscription.updateForItems(subs.getCbSubscriptionId())
            .subscriptionItemItemPriceId(0, planId)
            .subscriptionItemQuantity(0, numberOfMembersInOrg)
            .request();

          subs.setPaymentPlan(info.pricingPlan());
          subs.setPaymentInterval(info.pricingInterval());
          subs.setPaymentPlanId(planId);
          if (info.pricingPlan() != PaymentTerms.Plan.SOLO) {
            // IF pricing plan is not solo reset the user confirmation key
            SubscriptionInfo subInfo = subs.getInfo();
            if (subInfo == null) {
              subInfo = SubscriptionInfo.builder().build();
            }
            subInfo.setSoloPlanDowngradeIntentReceived(false);
            subs.setInfo(subInfo);
          }

          Subscription updatedSub = repo.save(subs);
          List<EntityConfigKV> entityConfigKVS = setCreditsForOrg(updatedSub, numberOfMembersInOrg);

          qMsgService.sendSqsMessage("SUBS_UPGRADE_DOWNGRADE_SIDE_EFFECT", Map.of(
            "orgIdStr", Long.toString(subs.getOrgId()),
            "beforePlan", beforePlan.name(),
            "afterPlan", updatedSub.getPaymentPlan().name()
          ));

          return RespSubscription.from(updatedSub, entityConfigKVS);
        } else {
          throw new RuntimeException("Unknown subscription manager " + subs.getManagedBy());
        }
      }
    } catch (Exception e) {
      log.error("Can't update {} subscription plan to {}", subs.getCbSubscriptionId(), planId, e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while updating subscription");
    }
  }

  @Transactional
  public RespSubscription updateSubscriptionForUser(ReqSubscriptionInfo info, User user) {
    if (user.getBelongsToOrg() == null) return null;
    return updateSubscription(info, user);
  }

  public Subscription getSubscriptionById(String subId) {
    return repo.getSubscriptionByCbSubscriptionId(subId);
  }

  @Async
  @Transactional
  public void updateNoOfSeatInSubscription(Long orgId) {
    try {
      Thread.sleep(10000);
    } catch (InterruptedException e) {
      log.warn("updateNoOfSeatInSubscription did not wait", e);
    }
    final int newSeatQuantity = orgService.getCountOfActiveUsersInOrg(orgId);
    Subscription subs = repo.getSubscriptionByOrgId(orgId);
    String subsId = subs.getCbSubscriptionId();
    if (StringUtils.isBlank(subsId)) {
      log.error("Seat change requested but subscription id not found for org {}", orgId);
      return;
    }

    try {
      log.info("Updating seat {} in subscription with id {}", newSeatQuantity, subsId);
      com.chargebee.models.Subscription.updateForItems(subsId)
        .subscriptionItemItemPriceId(0, subs.getPaymentPlanId())
        .subscriptionItemQuantity(0, newSeatQuantity)
        .request();
      setCreditsForOrg(subs, newSeatQuantity);
    } catch (Exception e) {
      log.error("Can't update {} subscription quantity to {}", subsId, newSeatQuantity);
      throw new RuntimeException(e);
    }
  }

  @Transactional
  public void downgradeSubscriptionToFreePlan(com.chargebee.models.Subscription cbSub) {
    try {
      Subscription subs = repo.getSubscriptionByCbSubscriptionId(cbSub.id());
      Integer quantity = orgService.getCountOfActiveUsersInOrg(subs.getOrgId());
      com.chargebee.models.Subscription.updateForItems(cbSub.id())
        .subscriptionItemItemPriceId(0, paymentConfig.getPlanId(PaymentTerms.Plan.SOLO, PaymentTerms.Interval.YEARLY))
        .subscriptionItemQuantity(0, quantity)
        .request();
    } catch (Exception e) {
      log.error("Can't downgrade subscription", e);
      throw new RuntimeException(e);
    }
  }

  public String createHostedPage(User user, Optional<ReqSubscriptionInfo> info) {
    Subscription subs = repo.getSubscriptionByOrgId(user.getBelongsToOrg());
    if (subs == null) return null;

    String subId = subs.getCbSubscriptionId();
    String paymentPlanId = info.isPresent() ? paymentConfig.getPlanId(info.get().pricingPlan(), info.get().pricingInterval()) : subs.getPaymentPlanId();
    try {
      final int numberOfMembersInOrg = orgService.getCountOfActiveUsersInOrg(user.getBelongsToOrg());
      Result result = HostedPage.checkoutExistingForItems()
        .subscriptionId(subId)
        .subscriptionItemItemPriceId(0, paymentPlanId)
        .subscriptionItemQuantity(0, numberOfMembersInOrg)
        .request();
      HostedPage hostedPage = result.hostedPage();
      return hostedPage.toJson();
    } catch (Exception e) {
      log.error("Can't complete payment request for {} ", user.getEmail(), e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Please try again");
    }
  }

  @Transactional
  public String createHostedPageForAiCredit(User user) {
    Subscription subs = repo.getSubscriptionByOrgId(user.getBelongsToOrg());
    Org org = orgRepo.findById(subs.getOrgId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    String custId = subs.getCbCustomerId();

    if (subs.getManagedBy().equals(SubscriptionManagedBy.APPSUMO)) {
      if (StringUtils.isBlank(custId)) {
        try {
          Result cusomerResult = Customer.create()
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .email(user.getEmail())
            .company(org.getDisplayName())
            .request();
          Customer customer = cusomerResult.customer();
          custId = customer.id();

          subs.setCbCustomerId(customer.id());
          repo.save(subs);
        } catch (Exception e) {
          log.error("Something went wrong while trying to create customer for appsumo customer with org {}", org.getId());
          throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while trying to create customer for appsumo customer with org " + org.getId());
        }
      }
    }

    try {
      Result result = HostedPage.checkoutOneTimeForItems()
        .customerId(custId)
        .itemPriceItemPriceId(0, paymentConfig.getAiChargeId())
        .itemPriceQuantity(0, PaymentConfig.PLAN_DEFAULT_AI_CREDIT.get(subs.getPaymentPlanId()).value())
        .request();

      HostedPage hostedPage = result.hostedPage();
      return hostedPage.toJson();
    } catch (Exception e) {
      log.error("Can't complete payment request for {} ", user.getEmail(), e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Please try again");
    }
  }

  @Transactional
  public void resyncSubscription(com.chargebee.models.Subscription cbSubs, EventType eventType) {
    Subscription subs = repo.getSubscriptionByCbSubscriptionId(cbSubs.id());
    PaymentTerms.Plan beforePlan = subs.getPaymentPlan();
    if (subs.getManagedBy() != SubscriptionManagedBy.CHARGEBEE) return;

    com.chargebee.models.Subscription.SubscriptionItem subscriptionItem = cbSubs.subscriptionItems().get(0);
    log.info("Resyncing subscription id={} status={} planId={}", cbSubs.id(), cbSubs.status(), subscriptionItem.itemPriceId());
    subs.setTrialEndsOn(cbSubs.trialEnd());
    subs.setTrialStartedOn(cbSubs.trialStart());
    subs.setPaymentPlanId(subscriptionItem.itemPriceId());
    subs.setStatus(cbSubs.status());
    Pair<PaymentTerms.Plan, PaymentTerms.Interval> items = paymentConfig.getPlanItemsById(subscriptionItem.itemPriceId());
    if (items != null) {
      subs.setPaymentPlan(items.getValue0());
      subs.setPaymentInterval(items.getValue1());
    }
    final int seatQuantity = orgService.getCountOfActiveUsersInOrg(subs.getOrgId());
    setCreditsForOrg(subs, seatQuantity);
    subs = repo.save(subs);

    // Automatic downgrade to solo go via this route
    // We need this additional check because this function is called many times via chargebee webhook
    if (!StringUtils.equalsIgnoreCase(beforePlan.name(), subs.getPaymentPlan().name()) && eventType == EventType.SUBSCRIPTION_CHANGED) {
      qMsgService.sendSqsMessage("SUBS_UPGRADE_DOWNGRADE_SIDE_EFFECT", Map.of(
        "orgIdStr", Long.toString(subs.getOrgId()),
        "beforePlan", beforePlan.name(),
        "afterPlan", subs.getPaymentPlan().name()
      ));
    }
  }

  public RespSubsValidation validate(Long orgId) {
    RespSubsValidation validationResult = new RespSubsValidation();
    try {
      Subscription subs = repo.getSubscriptionByOrgId(orgId);
      if (subs.getManagedBy() == SubscriptionManagedBy.CHARGEBEE) {
        Result currentSub = com.chargebee.models.Subscription.retrieve(subs.getCbSubscriptionId()).request();
        JSONObject subJson = currentSub.jsonResponse();
        JSONObject customer = (JSONObject) subJson.get("customer");
        String cardStatus = (String) customer.get("card_status");
        validationResult.setCardPresent(!StringUtils.equalsIgnoreCase(cardStatus, "no_card"));
      } else {
        validationResult.setCardPresent(true);
      }
    } catch (Exception e) {
      validationResult.setCardPresent(true);
      log.error("Error while getting subscription result", e);
      Sentry.captureException(e);
    }
    return validationResult;
  }

  public void sendUserDetailsWithPlans(User user, Subscription subs) {
    Map<String, String> payload = new HashMap<>();
    payload.put("email", user.getEmail());
    payload.put("firstName", user.getFirstName());
    if (!StringUtils.isBlank(user.getLastName())) payload.put("lastName", user.getLastName());
    payload.put("subs", subs.getPaymentPlan().name());
    nfHookService.sendNotification(NfEvents.NEW_USER_SIGNUP_WITH_SUBS, payload);
  }

  @Transactional
  public void checkEventAndTopupCredit(Event event) {
    try {
      Event.Content content = event.content();
      EventType eventType = event.eventType();

      if (eventType.equals(EventType.PAYMENT_SUCCEEDED)) {
        boolean isPaymentForAI = checkIfPaymentForAI(content);
        String customerId = content.customer().id();
        if (isPaymentForAI) {
          Integer quantity = content.invoice().lineItems().get(0).quantity();
          Subscription subs = repo.getSubscriptionByCbCustomerId(customerId);

          List<EntityConfigKV> entityConfigKVS = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(ConfigEntityType.Org, subs.getOrgId(), EntityConfigConfigType.AI_CREDIT);

          Map<String, EntityConfigKV> entityConfigKVMap = entityConfigKVS.stream()
            .collect(Collectors.toMap(EntityConfigKV::getConfigKey, Function.identity()));

          EntityConfigKV entityConfigKV = entityConfigKVMap.getOrDefault(TOPUP_CREDIT, EntityConfigKV.builder()
            .entityId(subs.getOrgId())
            .entityType(ConfigEntityType.Org)
            .configType(EntityConfigConfigType.AI_CREDIT)
            .configKey(TOPUP_CREDIT)
            .configVal(new CreditInfo(quantity, quantity, Utils.getCurrentUtcTimestamp()))
            .build());

          CreditInfo creditInfo = mapper.convertValue(entityConfigKV.getConfigVal(), CreditInfo.class);

          creditInfo.setValue(creditInfo.getValue() + quantity);
          creditInfo.setUpdatedAt(Utils.getCurrentUtcTimestamp());

          entityConfigKV.setConfigVal(creditInfo);
          entityConfigKVRepo.save(entityConfigKV);

        }
      } else if (eventType.equals(EventType.PAYMENT_FAILED)) {
        log.error("The payment failed {}", event);
        Sentry.captureException(new RuntimeException("The payment failed" + event));
      }
    } catch (Exception e) {
      log.error("Something went wrong while updating credits for organisation ", e);
      Sentry.captureException(e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while updating credits for organisation " + e);
    }
  }

  private boolean checkIfPaymentForAI(Event.Content content) {
    Invoice.LineItem.EntityType entityType = content.invoice().lineItems().get(0).entityType();
    String entityId = content.invoice().lineItems().get(0).entityId();
    return entityType.equals(Invoice.LineItem.EntityType.CHARGE_ITEM_PRICE)
      && entityId.equals(paymentConfig.getAiChargeId());
  }

  @Transactional
  public RespSubscription setCreditsForOrg(Long orgId, int addedUser, boolean shouldResetUsage) {
    Subscription subscription = repo.getSubscriptionByOrgId(orgId);
    final int seatQuantity = orgService.getCountOfActiveUsersInOrg(subscription.getOrgId());
    List<EntityConfigKV> entityConfigKVS = setCreditsForOrg(subscription, seatQuantity + addedUser, shouldResetUsage);
    return RespSubscription.from(subscription, entityConfigKVS);
  }

  @Transactional
  public List<EntityConfigKV> setCreditsForOrg(Subscription subscription, int userCount) {
    return setCreditsForOrg(subscription, userCount, false);
  }

  @Transactional
  public List<EntityConfigKV> setCreditsForOrg(Subscription subscription, int userCount, boolean shouldResetUsage) {
    List<EntityConfigKV> existingCredits = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      subscription.getOrgId(),
      EntityConfigConfigType.AI_CREDIT,
      FABLE_GIVEN_CREDIT
    );
    List<EntityConfigKV> updatedCredits = new ArrayList<>();

    PaymentConfig.CreditValue creditValue = determineFableCredits(subscription);
    // for some plan user credits are not dependent on how many users are there in org
    int creditScaledByUserCount = creditValue.isCreditPerUser() ? userCount * creditValue.value() : creditValue.value();

    if (existingCredits.isEmpty()) {
      updatedCredits = setCreditsForOrgWhenCreditsIsEmpty(subscription, creditScaledByUserCount);
    } else {
      EntityConfigKV fableGivenCredit = existingCredits.get(0);
      CreditInfo creditInfo = mapper.convertValue(fableGivenCredit.getConfigVal(), CreditInfo.class);
      creditInfo.setValue(creditScaledByUserCount);
      creditInfo.setAbsValue(creditScaledByUserCount);
      creditInfo.setUpdatedAt(Utils.getCurrentUtcTimestamp());
      fableGivenCredit.setConfigVal(creditInfo);

      if (shouldResetUsage) {
        List<EntityConfigKV> usedCreditAll = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
          ConfigEntityType.Org,
          subscription.getOrgId(),
          EntityConfigConfigType.AI_CREDIT,
          CREDIT_USED
        );
        EntityConfigKV usedCredit = usedCreditAll.get(0);
        CreditInfo usedCreditInfo = mapper.convertValue(usedCredit.getConfigVal(), CreditInfo.class);
        int usedValue = usedCreditInfo.getValue();
        // During reset we only reset fable given credit
        // Let's say fable_given_credit = 100 & top_up_credit = 50 and user is used up 75 credits. Since the credit will
        // first go from fable_given_credit hence during usage reset we would do max(0, 75 - 100) = 0
        // Now let's say user fable_given_credit = 100 & top_up_credit = 50 and user is used up 125 credits
        // i.e. user has used up all fable given credit and then used up 25/50 user credit, so we would keep the usage
        // as max(125 - 100) = 25. This will keep the usage from topup credit.
        int resetValue = Math.max(0, usedValue - creditInfo.getValue());
        usedCreditInfo.setValue(resetValue);
        usedCreditInfo.setUpdatedAt(Utils.getCurrentUtcTimestamp());
        usedCredit.setConfigVal(usedCreditInfo);
        updatedCredits.add(usedCredit);
      }

      updatedCredits.add(fableGivenCredit);
    }
    entityConfigKVRepo.saveAll(updatedCredits);
    return updatedCredits;
  }

  private List<EntityConfigKV> setCreditsForOrgWhenCreditsIsEmpty(Subscription subs, int credits) {
    List<EntityConfigKV> entityConfigKVS = new ArrayList<>();

    EntityConfigKV fableGivenCredit = EntityConfigKV.builder()
      .entityId(subs.getOrgId())
      .entityType(ConfigEntityType.Org)
      .configType(EntityConfigConfigType.AI_CREDIT)
      .configKey(FABLE_GIVEN_CREDIT)
      .configVal(new CreditInfo(credits, 0, Utils.getCurrentUtcTimestamp()))
      .build();

    EntityConfigKV topUpCredit = EntityConfigKV.builder()
      .entityId(subs.getOrgId())
      .entityType(ConfigEntityType.Org)
      .configType(EntityConfigConfigType.AI_CREDIT)
      .configKey(TOPUP_CREDIT)
      .configVal(new CreditInfo(0, 0, Utils.getCurrentUtcTimestamp()))
      .build();

    EntityConfigKV creditUsed = EntityConfigKV.builder()
      .entityId(subs.getOrgId())
      .entityType(ConfigEntityType.Org)
      .configType(EntityConfigConfigType.AI_CREDIT)
      .configKey(CREDIT_USED)
      .configVal(new CreditInfo(0, 0, Utils.getCurrentUtcTimestamp()))
      .build();

    entityConfigKVS.add(fableGivenCredit);
    entityConfigKVS.add(topUpCredit);
    entityConfigKVS.add(creditUsed);
    return entityConfigKVS;
  }

  private PaymentConfig.CreditValue determineFableCredits(Subscription subscription) {
    if (subscription.getManagedBy() != SubscriptionManagedBy.CHARGEBEE) {
      return PaymentConfig.PLAN_DEFAULT_AI_CREDIT.get(subscription.getPaymentPlanId());
    }
    PaymentConfig.CreditValue creditValue = subscription.getStatus().equals(com.chargebee.models.Subscription.Status.IN_TRIAL) ?
      PaymentConfig.PLAN_DEFAULT_AI_CREDIT.get(subscription.getStatus().name()) :
      PaymentConfig.PLAN_DEFAULT_AI_CREDIT.get(subscription.getPaymentPlanId());
    // For legacy plans, let's by default set 100 credits.
    if (creditValue == null) creditValue = new PaymentConfig.CreditValue(100, false);
    return creditValue;
  }

  @Transactional
  public Pair<Subscription, List<EntityConfigKV>> getSubscriptionWithCreditInfo(Long orgId) {
    List<SubscriptionWithCredit> subscriptionWithCredits = repo.getSubscriptionAndCredit(orgId, ConfigEntityType.Org, EntityConfigConfigType.AI_CREDIT);

    Subscription subscription = subscriptionWithCredits.stream()
      .map(SubscriptionWithCredit::getSubscription)
      .filter(Objects::nonNull)
      .findFirst()
      .orElse(null);

    List<EntityConfigKV> entityConfigKVS = subscriptionWithCredits.stream()
      .map(SubscriptionWithCredit::getEntityConfigKV)
      .filter(Objects::nonNull)
      .distinct()
      .collect(Collectors.toList());

    return Pair.with(subscription, entityConfigKVS);
  }

  @Transactional
  public RespSubscription updateCreditAfterDeduction(ReqDeductCredit req, User user) {
    Pair<Subscription, List<EntityConfigKV>> subscriptionWithCreditInfo = getSubscriptionWithCreditInfo(user.getBelongsToOrg());
    Subscription subs = subscriptionWithCreditInfo.getValue0();
    List<EntityConfigKV> creditDetails = subscriptionWithCreditInfo.getValue1();
    EntityConfigKV fableCredit = creditDetails.stream().filter(credit -> credit.getConfigKey().equals(FABLE_GIVEN_CREDIT)).findFirst().get();
    EntityConfigKV topUpCredit = creditDetails.stream().filter(credit -> credit.getConfigKey().equals(TOPUP_CREDIT)).findFirst().get();
    EntityConfigKV usedCredit = creditDetails.stream().filter(credit -> credit.getConfigKey().equals(CREDIT_USED)).findFirst().get();

    List<EntityConfigKV> updatedCreditDetails = new ArrayList<>();

    CreditInfo fableCreditInfo = mapper.convertValue(fableCredit.getConfigVal(), CreditInfo.class);
    CreditInfo topUpCreditInfo = mapper.convertValue(topUpCredit.getConfigVal(), CreditInfo.class);
    CreditInfo usedCreditInfo = mapper.convertValue(usedCredit.getConfigVal(), CreditInfo.class);

    // current normalized credit usage can't go above fable credit info + topup credit info
    // When credit gets deducted it's deducted by unit. But then it's scaled to a value for perception purpose
    // however we store non-normalized credit in absValue
    int usageVal = req.getDeductBy() * CREDIT_SCALED_BY;
    int currNValue = usedCreditInfo.getValue() + usageVal;
    int totalCredit = fableCreditInfo.getValue() + topUpCreditInfo.getValue();
    usedCreditInfo.setAbsValue(currNValue);
    usedCreditInfo.setValue(Math.min(currNValue, totalCredit));
    usedCredit.setConfigVal(usedCreditInfo);

    updatedCreditDetails.add(fableCredit);
    updatedCreditDetails.add(topUpCredit);
    updatedCreditDetails.add(entityConfigKVRepo.save(usedCredit));
    return RespSubscription.from(subs, updatedCreditDetails);
  }

  @Transactional
  public RespSubscription resetCreditUsage(Long orgId) {
    return setCreditsForOrg(orgId, 0, true);
  }

  @Transactional
  public RespSubscription migrateFableCredit(Long orgId) {
    return setCreditsForOrg(orgId, 0, false);
  }

  @Transactional
  public RespSubscription updateSubsInfo(ReqUpdateSubInfo req, User user) {
    Pair<Subscription, List<EntityConfigKV>> pair = getSubscriptionCreditPairForUser(user);
    if (pair == null) {
      log.warn("User {} with orgId {} requested subscription but it's not found.", user.getEmail(), user.getBelongsToOrg());
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    Subscription sub = pair.getValue0();
    List<EntityConfigKV> entityConfigKVS = pair.getValue1();

    SubscriptionInfo info = sub.getInfo();
    if (info == null) info = SubscriptionInfo.builder().build();
    if (req.getSoloPlanDowngradeIntentReceived().isPresent())
      info.setSoloPlanDowngradeIntentReceived(req.getSoloPlanDowngradeIntentReceived().get());

    sub.setInfo(info);
    sub = repo.save(sub);
    return RespSubscription.from(sub, entityConfigKVS);
  }
}
