package com.sharefable.api.controller.v1.vendor;

import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.IntegrationService;
import com.sharefable.api.service.vendor.CobaltService;
import com.sharefable.api.transport.req.ReqCobaltEvent;
import com.sharefable.api.transport.req.ReqNewLinkedAccount;
import com.sharefable.api.transport.resp.RespAccountToken;
import com.sharefable.api.transport.resp.RespLinkedApps;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class CobaltController {
  private final CobaltService cobaltService;
  private final IntegrationService integrationService;

  @RequestMapping(value = Routes.TOKEN_FOR_LINKED_ACCOUNT, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespAccountToken> getToken(@AuthUser User user) {
    RespAccountToken resp = cobaltService.getTokenForLinkedAccount(user);
    return ApiResp.<RespAccountToken>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.LIST_APPS_FOR_LINKED_ACCOUNT, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespLinkedApps[]> getAllApplication(@AuthUser User user) {
    List<RespLinkedApps> resp = cobaltService.getAllApplicationForLinkedAccount(user);
    return ApiResp.<RespLinkedApps[]>builder().status(ApiResp.ResponseStatus.Success).data(resp.toArray(RespLinkedApps[]::new)).build();
  }

  @RequestMapping(value = Routes.COBALT_EVENT_PUB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> sendEventPublic(@RequestParam(name = "rid") String rid, @RequestBody ReqCobaltEvent event) {
    integrationService.executeIntegrationIfAny(event.event(), event.payload());
    cobaltService.sendEventPublic(event, rid);
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data("ok").build();
  }

  @RequestMapping(value = Routes.COBALT_EVENT_AUTHED, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> sendEventAuthed(@RequestBody ReqCobaltEvent event, @AuthUser User user) {
    cobaltService.sendEventAuthed(event, user);
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data("ok").build();
  }

  @RequestMapping(value = Routes.FORCE_CREATE_LINKED_ACCOUNT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> createLinkedAccount(@RequestBody ReqNewLinkedAccount body) {
    cobaltService.createLinkedAccountIfNotExist(body);
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data("ok").build();
  }
}
