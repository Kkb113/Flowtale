package com.sharefable.analytics.controller.v1;

import com.sharefable.Routes;
import com.sharefable.analytics.entity.Activity;
import com.sharefable.analytics.entity.MEntityMetrics;
import com.sharefable.analytics.entity.MEntityMetricsDaily;
import com.sharefable.analytics.entity.MEntitySubEntityDistribution;
import com.sharefable.analytics.repo.*;
import com.sharefable.analytics.transport.HouseLeadWithRichInfo;
import com.sharefable.analytics.transport.RespEntityMetrics;
import com.sharefable.analytics.transport.RespHouseLead;
import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.controller.v1.DemoEntityController;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.RespAggregateLeadAnalytics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping(Routes.API_V1)
@RequiredArgsConstructor
@Slf4j
public class InsightController {
  private final DemoEntityController demoEntityController;
  private final MEntityMetricsRepo mEntityMetricsRepo;
  private final MHouseLeadRepo mHouseLeadRepo;
  private final MEntityMetricsDailyRepo mEntityMetricsDailyRepo;
  private final MEntitySubEntityDistRepo mEntitySubEntityDistRepo;
  private final ActivityRepo activityRepo;

  @RequestMapping(value = Routes.ENTITY_METRICS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespEntityMetrics> saveActivity(@RequestParam("rid") String rid, @AuthUser User user) {
    DemoEntity entity = demoEntityController.getEntityAfterValidation(rid, user);
    Optional<MEntityMetrics> resp = mEntityMetricsRepo.findById(entity.getId());

    RespEntityMetrics respEntityMetrics = resp
      .map(RespEntityMetrics::from).orElseGet(RespEntityMetrics::empty);

    return ApiResp.<RespEntityMetrics>builder().status(ApiResp.ResponseStatus.Success)
      .data(respEntityMetrics).build();
  }

  @RequestMapping(value = Routes.LEADS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespHouseLead>> getLeadsForTour(@RequestParam("rid") String rid, @AuthUser User user) {
    DemoEntity entity = demoEntityController.getEntityAfterValidation(rid, user);
    List<HouseLeadWithRichInfo> leads = mHouseLeadRepo.getHouseLeadsForEntity(entity.getId());
    List<RespHouseLead> resp = leads.stream().map(l -> RespHouseLead.from(l.getLead(), l.getInfo())).toList();
    return ApiResp.<List<RespHouseLead>>builder().status(ApiResp.ResponseStatus.Success)
      .data(resp).build();
  }

  @RequestMapping(value = Routes.ENTITY_METRICS_DAILY, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<MEntityMetricsDaily>> getEntityMetricsDaily(@RequestParam("rid") String rid, @AuthUser User user) {
    DemoEntity entity = demoEntityController.getEntityAfterValidation(rid, user);
    List<MEntityMetricsDaily> resp = mEntityMetricsDailyRepo.getMEntityMetricsDailiesByEntityId(entity.getId());
    return ApiResp.<List<MEntityMetricsDaily>>builder().status(ApiResp.ResponseStatus.Success)
      .data(resp).build();
  }


  @RequestMapping(value = Routes.ENTITY_SUBENTITY_DIST_METRICS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<MEntitySubEntityDistribution>> getEntitySubEntityMetricDistribution(@RequestParam("rid") String rid, @AuthUser User user) {
    DemoEntity entity = demoEntityController.getEntityAfterValidation(rid, user);
    List<MEntitySubEntityDistribution> resp = mEntitySubEntityDistRepo.getMEntitySubEntityDistributionsByEntityId(entity.getId());
    return ApiResp.<List<MEntitySubEntityDistribution>>builder().status(ApiResp.ResponseStatus.Success)
      .data(resp).build();
  }

  @RequestMapping(value = Routes.ACTIVITY_DATA, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<Activity>> getActivityData(@PathVariable("entityRid") String entityRid, @PathVariable("aid") String aid, @AuthUser User user) {
    DemoEntity entity = demoEntityController.getEntityAfterValidation(entityRid, user);
    List<Activity> activities = activityRepo.getActivitiesByAidAndEncEntityIdOrderByUpdatedAtDesc(aid, entity.getId());
    return ApiResp.<List<Activity>>builder().status(ApiResp.ResponseStatus.Success)
      .data(activities).build();
  }

  @RequestMapping(value = Routes.GET_ORG_LEVEL_LEAD_ANALYTICS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespAggregateLeadAnalytics> getOrgLevelLeadAnalytics(@AuthUser User user) {
    List<DemoEntity> publishedDemoEntityForOrg = demoEntityController.getPublishedDemoEntityForOrg(user);

    Map<Long, DemoEntity> hm = new HashMap<>(publishedDemoEntityForOrg.size());
    for (DemoEntity demoEntity : publishedDemoEntityForOrg) hm.put(demoEntity.getId(), demoEntity);

    List<HouseLeadWithRichInfo> leads = mHouseLeadRepo.getHouseLeadsForEntity(hm.keySet());
    List<RespHouseLead> respHouseLeads = leads.stream().map(l ->
      RespHouseLead.from(l.getLead(), l.getInfo(), hm.get(l.getLead().getEntityId()))).toList();
    RespAggregateLeadAnalytics resp = RespAggregateLeadAnalytics.builder()
      .noOfDemos(publishedDemoEntityForOrg.size())
      .leads(respHouseLeads)
      .build();
    return ApiResp.<RespAggregateLeadAnalytics>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }
}
