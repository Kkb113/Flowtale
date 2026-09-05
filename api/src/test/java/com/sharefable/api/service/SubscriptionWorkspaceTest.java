package com.sharefable.api.service;

import com.sharefable.api.common.SubscriptionManagedBy;
import com.sharefable.api.config.LocalDevelopmentConfig;
import com.sharefable.api.config.PaymentConfig;
import com.sharefable.api.entity.Log;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.Subscription;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.EntityConfigKVRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.SubscriptionRepo;
import com.sharefable.api.service.vendor.SlackMsgService;
import com.sharefable.api.transport.PaymentTerms;
import com.sharefable.api.transport.req.ReqSubscriptionInfo;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SubscriptionWorkspaceTest {
  final SubscriptionRepo subscriptions = mock(SubscriptionRepo.class);
  final OrgRepo orgs = mock(OrgRepo.class);
  final OrgService orgService = mock(OrgService.class);
  final LogService logs = mock(LogService.class);
  final EntityConfigKVRepo credits = mock(EntityConfigKVRepo.class);
  final PaymentConfig payment = mock(PaymentConfig.class);
  final SubscriptionService service = new SubscriptionService(subscriptions, payment,
    mock(LocalDevelopmentConfig.class), orgService, orgs, logs, mock(SlackMsgService.class),
    mock(NfHookService.class), credits, mock(QMsgService.class));
  final ReqSubscriptionInfo upgrade = new ReqSubscriptionInfo(PaymentTerms.Plan.LIFETIME_TIER2,
    PaymentTerms.Interval.LIFETIME, "fixture-license");

  @Test void webhookReplacesOnlyItsWorkspaceSubscriptionWhenOwnerHasSelectedAnotherWorkspace() {
    User owner = User.builder().belongsToOrg(99L).email("owner@example.test").firstName("Owner").build();
    Org target = new Org(); target.setId(7L); target.setCreatedBy(owner);
    when(orgs.findById(7L)).thenReturn(Optional.of(target));
    Subscription previous = Subscription.builder().orgId(7L).managedBy(SubscriptionManagedBy.APPSUMO).build();
    when(subscriptions.getSubscriptionByOrgId(7L)).thenReturn(previous);
    when(payment.getCbApiKey()).thenReturn("fixture");
    when(payment.getCbSiteName()).thenReturn("fixture");
    when(payment.getPlanId(any(), any())).thenReturn("tier-2-USD-lifetime");
    when(logs.getLicenseFromLog("fixture-license")).thenReturn(Optional.of(
      Log.builder().logLine(Map.of("event", "upgrade", "tier", 2)).build()));

    var response = service.updateSubscription(upgrade, 7L);

    assertNotNull(response);
    assertEquals(PaymentTerms.Plan.LIFETIME_TIER2, response.getPaymentPlan());
    assertEquals(500, response.getAvailableCredits());
    assertEquals(99L, owner.getBelongsToOrg());
    verify(subscriptions).delete(previous);
    ArgumentCaptor<Subscription> saved = ArgumentCaptor.forClass(Subscription.class);
    verify(subscriptions).save(saved.capture());
    assertEquals(7L, saved.getValue().getOrgId());
    verify(subscriptions, never()).getSubscriptionByOrgId(99L);
    verify(orgs, never()).findById(99L);
    verify(credits).saveAll(argThat(values -> {
      for (var value : values) if (!Long.valueOf(7).equals(value.getEntityId())) return false;
      return true;
    }));
  }

  @Test void missingWorkspaceCannotFallBackToTheOwnersCurrentSelection() {
    when(orgs.findById(7L)).thenReturn(Optional.empty());
    assertEquals(404, assertThrows(ResponseStatusException.class,
      () -> service.updateSubscription(upgrade, 7L)).getStatusCode().value());
    verifyNoInteractions(subscriptions, credits, logs);
  }
}
