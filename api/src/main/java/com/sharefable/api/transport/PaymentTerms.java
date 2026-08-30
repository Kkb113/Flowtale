package com.sharefable.api.transport;

@GenerateTSDef
public class PaymentTerms {
  public enum Plan {
    SOLO,
    STARTUP,
    BUSINESS,
    LIFETIME_TIER1,
    LIFETIME_TIER2,
    LIFETIME_TIER3,
    LIFETIME_TIER4,
    LIFETIME_TIER5
  }

  public enum Interval {
    MONTHLY,
    YEARLY,
    LIFETIME
  }
}
