package com.sharefable.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.entity.*;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.PlatformIntegrationRepo;
import com.sharefable.api.repo.TenantIntegrationRepo;
import com.sharefable.api.transport.NfEvents;
import com.sharefable.api.transport.RespFatTenantIntegration;
import com.sharefable.api.transport.req.ReqAddOrUpdatePlatformIntegrationConfig;
import com.sharefable.api.transport.req.ReqCreateOrUpdateTenantIntegration;
import com.sharefable.api.transport.resp.RespOrg;
import com.sharefable.api.transport.resp.RespPlatformIntegration;
import com.sharefable.api.transport.resp.RespTenantIntegration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.StreamSupport;

@Service
@Slf4j
@RequiredArgsConstructor
public class IntegrationService {
  private final PlatformIntegrationRepo platformIntegrationRepo;
  private final TenantIntegrationRepo tenantIntegrationRepo;
  private final DemoEntityRepo demoEntityRepo;
  private final NfHookService nfHookService;
  private final OrgRepo orgRepo;

  ObjectMapper objectMapper = new ObjectMapper();

  @Transactional
  public void addOrUpdatePlatformIntegration(ReqAddOrUpdatePlatformIntegrationConfig req) {
    Iterable<PlatformIntegration> allInstalledIntegrations = platformIntegrationRepo.findAll();
    PlatformIntegration integration = null;
    for (PlatformIntegration installedIntegration : allInstalledIntegrations) {
      if (installedIntegration.getType() == req.type()) {
        integration = installedIntegration;
      }
    }

    if (integration == null) {
      integration = PlatformIntegration.builder()
        .type(req.type())
        .build();
    }

    integration.setName(req.name());
    integration.setIcon(req.icon());
    integration.setDescription(req.description());
    integration.setDisabled(req.disabled());
    integration.setPlatformConfig(req.config());

    platformIntegrationRepo.save(integration);
  }

  @Transactional
  public List<RespPlatformIntegration> getIntegrationsForOrg(Long orgId) {
    Iterable<PlatformIntegration> platformIntegrations = platformIntegrationRepo.findAll();
    List<Long> integrationIds = StreamSupport.stream(platformIntegrations.spliterator(), false).map(EntityBase::getId).toList();
    List<TenantIntegration> tenantIntegrations = tenantIntegrationRepo.getTenantIntegrationsByOrgIdAndIntegrationIdIn(orgId, integrationIds);
    HashMap<Long, List<TenantIntegration>> hm = new HashMap<>(tenantIntegrations.size());
    for (TenantIntegration tenantIntegration : tenantIntegrations) {
      List<TenantIntegration> ti;
      if ((ti = hm.get(tenantIntegration.getIntegrationId())) == null) {
        ti = new ArrayList<>();
      }
      ti.add(tenantIntegration);
      hm.put(tenantIntegration.getIntegrationId(), ti);
    }


    return StreamSupport.stream(platformIntegrations.spliterator(), false).map(pi ->
      RespPlatformIntegration.from(pi, hm.getOrDefault(pi.getId(), List.of()))
    ).toList();
  }

  public RespTenantIntegration addOrCreateTenantIntegration(Long orgId, ReqCreateOrUpdateTenantIntegration req) {
    Iterable<PlatformIntegration> platformIntegrations = platformIntegrationRepo.findAll();
    PlatformIntegration pi = null;
    for (PlatformIntegration platformIntegration : platformIntegrations) {
      if (platformIntegration.getType() == req.getIntegrationType()) {
        pi = platformIntegration;
      }
    }

    if (pi == null) {
      log.error("Tried to add tenant integration for a platform integration that does not exist. type=[{}]", req.getIntegrationType());
      return null;
    }

    TenantIntegration ti;
    if (req.getTenantIntegrationId() != null) {
      Optional<TenantIntegration> maybeTi = tenantIntegrationRepo.findById(req.getTenantIntegrationId());
      if (maybeTi.isEmpty()) {
        log.error("Tried to update tenant integration that does not exist. id=[{}]", req.getTenantIntegrationId());
        return null;
      }
      ti = maybeTi.get();
    } else {
      ti = TenantIntegration.builder()
        .orgId(orgId)
        .disabled(false)
        .tourId(req.getTourId() != null ? req.getTourId() : 0L)
        .integrationId(pi.getId())
        .build();
    }

    if (!StringUtils.isBlank(req.getEvent())) ti.setEvent(req.getEvent());
    if (req.getDisabled() != null) ti.setDisabled(req.getDisabled());
    if (req.getTenantConfig() != null) ti.setTenantConfig(req.getTenantConfig());

    return RespTenantIntegration.from(tenantIntegrationRepo.save(ti));
  }

  @Transactional
  public void deleteTenantIntegration(Long belongsToOrg, Long tenantIntegrationId) {
    tenantIntegrationRepo.deleteTenantIntegrationByOrgIdAndId(belongsToOrg, tenantIntegrationId);
  }

  @Transactional
  public void deleteTenantIntegration(Long belongsToOrg, List<Long> ids) {
    tenantIntegrationRepo.deleteTenantIntegrationsByOrgIdAndIdIn(belongsToOrg, ids);
  }

  public void executeIntegrationIfAny(String event, Map<String, Object> payload) {
    String tourIdRaw = payload.get("ti").toString();
    if (StringUtils.isBlank(tourIdRaw)) {
      log.error("Can't send event to integration as tourId is not present");
      return;
    }
    Long tourId;
    try {
      tourId = Long.valueOf(tourIdRaw);
    } catch (Exception e) {
      log.error("Can't send event to integration as tourId can't be parsed", e);
      return;
    }

    Optional<DemoEntity> maybeTour = demoEntityRepo.findById(tourId);
    if (maybeTour.isEmpty()) {
      log.error("Can't find tour with id {}. Skipping event to integration", tourId);
      return;
    }

    List<TenantIntegration> tis = tenantIntegrationRepo.getTenantIntegrationsByOrgIdAndEventAndTourIdIn(
      maybeTour.get().getBelongsToOrg(),
      event,
      List.of(0L, tourId));
    for (TenantIntegration ti : tis) {
      log.info("Integration triggered {}", ti.getId());
      try {
        HashMap<String, String> hm = new HashMap<>();
        hm.put("eventPayload", objectMapper.writeValueAsString(payload));
        hm.put("event", event);
        hm.put("integrationId", ti.getId().toString());
        nfHookService.sendNotification(NfEvents.RUN_INTEGRATION, hm);
      } catch (JsonProcessingException e) {
        log.error("Couldn't send event for processing", e);
      }
    }
  }

  @Transactional(readOnly = true)
  public RespFatTenantIntegration getFatTenantIntegrationData(Long tenantIntegrationId) {
    RespFatTenantIntegration resp = new RespFatTenantIntegration();

    Optional<TenantIntegration> maybeTenantIntegration = tenantIntegrationRepo.findById(tenantIntegrationId);
    maybeTenantIntegration.ifPresent(resp::setTenantIntegration);
    if (maybeTenantIntegration.isEmpty()) return resp;

    Optional<PlatformIntegration> maybePlatformIntegration =
      platformIntegrationRepo.findById(maybeTenantIntegration.get().getIntegrationId());
    maybePlatformIntegration.ifPresent(resp::setPlatformIntegration);

    Optional<Org> maybeOrg = orgRepo.findById(maybeTenantIntegration.get().getOrgId());
    maybeOrg.ifPresent(org -> resp.setOrg(RespOrg.from(org)));

    return resp;
  }
}
