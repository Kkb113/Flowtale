package com.sharefable.api.config;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class OrgContext {
  private static final ThreadLocal<Long> currentOrgId = new InheritableThreadLocal<>();

  public static Long getCurrentOrgId() {
    return currentOrgId.get();
  }

  public static void setCurrentOrgId(Long tenant) {
    currentOrgId.set(tenant);
  }

  public static void clear() {
    currentOrgId.remove();
  }
}