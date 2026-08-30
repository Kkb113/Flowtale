package com.sharefable.api.entity;

import com.sharefable.api.common.SubscriptionInfo;
import com.sharefable.api.common.SubscriptionManagedBy;
import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.PaymentTerms;
import com.sharefable.api.transport.resp.RespSubscription;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Type;

import java.sql.Timestamp;

@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespSubscription.class)
public class Subscription extends EntityBase {
  @Column(nullable = false)
  String paymentPlanId;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  PaymentTerms.Plan paymentPlan;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  PaymentTerms.Interval paymentInterval;

  @Column(nullable = false)
  String cbCustomerId;

  @Column(nullable = false)
  String cbSubscriptionId;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  private com.chargebee.models.Subscription.Status status;

  private Timestamp trialEndsOn;

  private Timestamp trialStartedOn;

  private Long orgId;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  private SubscriptionManagedBy managedBy;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private SubscriptionInfo info;
}
