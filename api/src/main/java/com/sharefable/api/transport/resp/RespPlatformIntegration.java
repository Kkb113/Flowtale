package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.PlatformIntegrationType;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.PlatformIntegration;
import com.sharefable.api.entity.TenantIntegration;
import com.sharefable.api.transport.GenerateTSDef;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespPlatformIntegration extends ResponseBase {
  private PlatformIntegrationType type;
  private String name;
  private String icon;
  private String description;
  private String slug;
  private Boolean disabled;
  private Map<String, Object> platformConfig;
  private List<RespTenantIntegration> tenantIntegrations;

  public static RespPlatformIntegration from(PlatformIntegration integration, List<TenantIntegration> ti) {
    try {
      RespPlatformIntegration resp = (RespPlatformIntegration) Utils.fromEntityToTransportObject(integration);
      resp.setSlug(integration.getType().toString());
      resp.setTenantIntegrations(
        ti.stream().map(RespTenantIntegration::from).toList()
      );
      return resp;
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespPlatformIntegration Empty() {
    return new RespPlatformIntegration();
  }
}
