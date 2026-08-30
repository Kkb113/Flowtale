package com.sharefable.api.controller.v1.vendor;

import com.sharefable.api.common.ApiResp;
import com.sharefable.api.common.PlatformIntegrationType;
import com.sharefable.Routes;
import com.sharefable.api.entity.ApiKey;
import com.sharefable.api.repo.ApiKeyRepo;
import com.sharefable.api.service.IntegrationService;
import com.sharefable.api.transport.req.ReqCreateOrUpdateTenantIntegration;
import com.sharefable.api.transport.resp.RespTenantIntegration;
import com.sharefable.api.transport.vendor.ReqZapierWebhookReg;
import io.sentry.Sentry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class ZapierController {
  private final ApiKeyRepo apiKeyRepo;
  private final IntegrationService integrationService;

  @RequestMapping(value = Routes.ZAPIER_WEBHOOK_REG, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> sub(@RequestHeader(name = "X-API-KEY") String apiKeyStr, @RequestBody ReqZapierWebhookReg req) {
    log.info("Zapier registration sub req {}", req);
    ApiKey apiKey = validateAndGetApiKey(apiKeyStr);
    Long orgId = apiKey.getOrg().getId();
    StringBuilder ids = new StringBuilder();
    for (Long tourId : req.tourIds()) {
      ReqCreateOrUpdateTenantIntegration integrationRegReq = new ReqCreateOrUpdateTenantIntegration(
        PlatformIntegrationType.Zapier,
        null,
        0L,
        req.event(),
        false,
        tourId,
        Map.of("hookUrl", req.hookUrl())
      );

      RespTenantIntegration respTenantIntegration = integrationService.addOrCreateTenantIntegration(orgId, integrationRegReq);
      ids.append(respTenantIntegration.getId());
      ids.append(":");
    }
    ids.setLength(ids.length() - 1);
    String unsubIds = ids.toString();
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data(unsubIds).build();
  }

  @RequestMapping(value = Routes.ZAPIER_WEBHOOK_UN_REG, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> sub(@RequestHeader(name = "X-API-KEY") String apiKeyStr, @RequestBody Map<String, String> unsubData) {
    log.info("Zapier registration unsub req {}", unsubData);
    ApiKey apiKey = validateAndGetApiKey(apiKeyStr);
    String idsStr = unsubData.get("unsubIds");
    Long orgId = apiKey.getOrg().getId();
    List<Long> ids = Arrays.stream(StringUtils.split(idsStr, ":")).map(Long::parseLong).toList();
    integrationService.deleteTenantIntegration(orgId, ids);

    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data(idsStr).build();
  }

  @RequestMapping(value = Routes.ZAPIER_WEBHOOK_SAMPLE, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public List<Map<String, Object>> sample(@RequestHeader(name = "X-API-KEY") String apiKeyStr) {
    return List.of(
      Map.of(
        "email", "alex@acme.com",
        "demo_rid", "untitled-bvyktli4jed4rbpz",
        "demo_name", "untitled"
      )
    );
  }


  private ApiKey validateAndGetApiKey(@RequestHeader(name = "X-API-KEY") String apiKeyStr) {
    ApiKey apiKey = apiKeyRepo.getApiKeyByApiKeyAndActiveIsTrue(apiKeyStr);
    if (apiKey == null) {
      String msg = String.format("Apikey [%s] not valid", apiKeyStr);
      Sentry.captureException(new RuntimeException(msg));
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    return apiKey;
  }
}
