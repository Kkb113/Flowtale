package com.sharefable.api.service.vendor;

import com.sharefable.api.config.AppConfig;
import com.sharefable.api.config.vendor.CobaltConfig;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.service.NfHookService;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.transport.req.ReqCobaltEvent;
import com.sharefable.api.transport.req.ReqNewLinkedAccount;
import com.sharefable.api.transport.resp.RespAccountToken;
import com.sharefable.api.transport.resp.RespLinkedApps;
import com.sharefable.api.transport.vendor.LinkedApps;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
public class CobaltService {
  private final CobaltConfig cobaltConfig;
  private final DemoEntityRepo demoEntityRepo;
  private final RestTemplate restClient;
  private final NfHookService nfHookService;
  private final AppConfig appConfig;

  @Autowired
  public CobaltService(CobaltConfig cobaltConfig, DemoEntityRepo demoEntityRepo, RestTemplate restClient, NfHookService nfHookService, AppConfig appConfig) {
    this.cobaltConfig = cobaltConfig;
    this.demoEntityRepo = demoEntityRepo;
    this.restClient = restClient;
    this.nfHookService = nfHookService;
    this.appConfig = appConfig;

    DefaultUriBuilderFactory defaultUriBuilderFactory = new DefaultUriBuilderFactory();
    defaultUriBuilderFactory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);
    this.restClient.setUriTemplateHandler(defaultUriBuilderFactory);
  }

  public RespAccountToken getTokenForLinkedAccount(User user) {
    try {
      HttpHeaders headers = getCommonHeaders();
      ReqToken reqToken = new ReqToken(user.getBelongsToOrg().toString());
      HttpEntity<ReqToken> entity = new HttpEntity<>(reqToken, headers);
      ResponseEntity<RespAccountToken> resp = this.restClient.exchange(cobaltConfig.getTokenUrl(), HttpMethod.POST, entity, RespAccountToken.class);
      return resp.getBody();
    } catch (Exception e) {
      log.error("#getTokenForLinkedAccount", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
    }
  }

  public List<RespLinkedApps> getAllApplicationForLinkedAccount(User user) {
    try {
      HttpHeaders headers = getCommonHeaders();
      headers.set(CobaltConfig.LINKED_ACCOUNT_ID, user.getBelongsToOrg().toString());
      HttpEntity<Void> entity = new HttpEntity<>(headers);
      ResponseEntity<LinkedApps[]> resp = this.restClient.exchange(cobaltConfig.getListAppUrl(), HttpMethod.GET, entity, LinkedApps[].class);

      List<LinkedApps> linkedApps = Arrays.asList(Objects.requireNonNull(resp.getBody()));

      return linkedApps.stream()
        .map(apps -> RespLinkedApps.builder()
          .name(apps.getName())
          .icon(apps.getIcon())
          .description(apps.getDescription())
          .type(apps.getType())
          .slug(apps.getSlug())
          .connected(apps.getConnected())
          .build())
        .collect(Collectors.toList());
    } catch (Exception e) {
      log.error("#getAllApplicationForLinkedAccount", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while getting list of application for the linked account");
    }
  }

  public void sendEventPublic(ReqCobaltEvent event, String tourRid) {
    Optional<DemoEntity> maybeTour = demoEntityRepo.findByRidAndDeletedEquals(tourRid, TourDeleted.ACTIVE);
    if (maybeTour.isEmpty()) return;

    event.payload().put("demo_url", appConfig.getDns() + "/live/demo/" + maybeTour.get().getRid());
    event.payload().put("demo_name", maybeTour.get().getDisplayName());
    try {
      sendEvent(event, maybeTour.get().getBelongsToOrg().toString());
    } catch (Exception e) {
      log.error("#sendEventPublic", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while sending event");
    }
  }

  public void sendEventAuthed(ReqCobaltEvent event, User user) {
    try {
      sendEvent(event, user.getBelongsToOrg().toString());
    } catch (Exception e) {
      log.error("#sendEventAuthed", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while sending event");
    }
  }

  public void sendEvent(ReqCobaltEvent event, String accountId) {
    HttpHeaders headers = getCommonHeaders();
    headers.set(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
    headers.set(CobaltConfig.LINKED_ACCOUNT_ID, accountId);
    HttpEntity<ReqCobaltEvent> entity = new HttpEntity<>(event, headers);
    this.restClient.exchange(cobaltConfig.getAppEventUrl(), HttpMethod.POST, entity, String.class);
  }

  @Transactional
  public void createLinkedAccountIfNotExist(ReqNewLinkedAccount body) {
//    List<HouseLeadInfo> maybeHouseLeadInfo = houseLeadInfoRepo.findHouseLeadInfoByOrgId(body.orgId());
//    if (maybeHouseLeadInfo.isEmpty()) {
//      nfHookService.sendNotification(NfEvents.NEW_ORG_CREATED, Map.of("id", body.orgId().toString()));
//    }
  }

  private HttpHeaders getCommonHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.set(CobaltConfig.API_KEY, cobaltConfig.getApiKey());
    return headers;
  }

  public record ReqToken(String linked_account_id) {
  }
}
