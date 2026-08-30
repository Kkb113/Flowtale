package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.TenantIntegration;
import com.sharefable.api.transport.GenerateTSDef;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespTenantIntegration extends ResponseBase {
  private Long id;
  private Boolean disabled;
  private String event;
  private Map<String, Object> tenantConfig;
  private Long relay;


  public static RespTenantIntegration from(TenantIntegration ti) {
    try {
      RespTenantIntegration resp = (RespTenantIntegration) Utils.fromEntityToTransportObject(ti);
      resp.setRelay(resp.id);
      return resp;
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespTenantIntegration Empty() {
    return new RespTenantIntegration();
  }
}
