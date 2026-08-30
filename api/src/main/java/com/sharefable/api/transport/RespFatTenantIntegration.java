package com.sharefable.api.transport;

import com.sharefable.api.entity.PlatformIntegration;
import com.sharefable.api.entity.TenantIntegration;
import com.sharefable.api.transport.resp.RespOrg;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@GenerateTSDef
public class RespFatTenantIntegration {
  private RespOrg org;
  private PlatformIntegration platformIntegration;
  private TenantIntegration tenantIntegration;
}
