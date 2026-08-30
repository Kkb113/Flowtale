package com.sharefable.api.transport.req;

import com.sharefable.api.common.PlatformIntegrationType;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@GenerateTSDef
public class ReqCreateOrUpdateTenantIntegration {
  PlatformIntegrationType integrationType;
  @OptionalPropInTS
  Long tenantIntegrationId;
  @OptionalPropInTS
  Long relayId;
  String event;
  @OptionalPropInTS
  Boolean disabled;
  @OptionalPropInTS
  Long tourId;
  Map<String, Object> tenantConfig;
}
