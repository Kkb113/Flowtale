package com.sharefable.api.controller.v1;

import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.config.AppSettings;
import com.sharefable.Routes;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.IntegrationService;
import com.sharefable.api.transport.RespFatTenantIntegration;
import com.sharefable.api.transport.req.ReqAddOrUpdatePlatformIntegrationConfig;
import com.sharefable.api.transport.req.ReqCreateOrUpdateTenantIntegration;
import com.sharefable.api.transport.resp.RespPlatformIntegration;
import com.sharefable.api.transport.resp.RespTenantIntegration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class IntegrationController {
  private final AppSettings appSettings;
  private final IntegrationService integrationService;

  @RequestMapping(value = Routes.ADD_OR_UPDATE_PLATFORM_INTEGRATION, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> createOrUpdatePlatformIntegration(@RequestBody ReqAddOrUpdatePlatformIntegrationConfig req) {
    if (!appSettings.isDataEntryFlagSet()) {
      log.error("Data entry requested but flag not set.");
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }

    integrationService.addOrUpdatePlatformIntegration(req);

    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data("ok").build();
  }

  @RequestMapping(value = Routes.TENANT_INTEGRATIONS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespPlatformIntegration>> createOrUpdatePlatformIntegration(@AuthUser User user) {
    List<RespPlatformIntegration> resp = integrationService.getIntegrationsForOrg(user.getBelongsToOrg());
    return ApiResp.<List<RespPlatformIntegration>>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.TENANT_INTEGRATION, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespTenantIntegration> addTenantIntegration(@AuthUser User user, @RequestBody ReqCreateOrUpdateTenantIntegration req) {
    RespTenantIntegration resp = integrationService.addOrCreateTenantIntegration(user.getBelongsToOrg(), req);
    if (req.getRelayId() != null) {
      resp.setRelay(req.getRelayId());
    }
    return ApiResp.<RespTenantIntegration>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.DEL_TENANT_INTEGRATION, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> deleteTenantIntegration(@AuthUser User user, @PathVariable("id") Long tenantIntegrationId) {
    integrationService.deleteTenantIntegration(user.getBelongsToOrg(), tenantIntegrationId);
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data("ok").build();
  }


  @RequestMapping(value = Routes.GET_TENANT_INTEGRATION_BY_ID, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespFatTenantIntegration> getFatTenantIntegration(@PathVariable("id") Long tenantIntegrationId) {
    RespFatTenantIntegration resp = integrationService.getFatTenantIntegrationData(tenantIntegrationId);
    return ApiResp.<RespFatTenantIntegration>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }
}
