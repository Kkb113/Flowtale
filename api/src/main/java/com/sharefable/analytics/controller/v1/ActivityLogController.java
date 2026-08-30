package com.sharefable.analytics.controller.v1;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.Routes;
import com.sharefable.analytics.common.DeviceAndGeoInfo;
import com.sharefable.analytics.entity.Activity;
import com.sharefable.analytics.entity.ActivityBase;
import com.sharefable.analytics.entity.ActivityDt;
import com.sharefable.analytics.repo.ActivityDtRepo;
import com.sharefable.analytics.repo.ActivityRepo;
import com.sharefable.analytics.repo.AidRichInfoRepo;
import com.sharefable.analytics.transport.InActivityLog;
import com.sharefable.analytics.transport.LogForEntityCategory;
import com.sharefable.analytics.transport.ReqActivityLog;
import com.sharefable.api.config.AppConfig;
import com.sharefable.api.service.FirehoseService;
import io.sentry.Sentry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping(Routes.API_V1)
@RequiredArgsConstructor
@Slf4j
public class ActivityLogController {
  private final static ObjectMapper objectMapper = new ObjectMapper();
  private final ActivityRepo activityRepo;
  private final ActivityDtRepo activityDtRepo;
  private final AidRichInfoRepo aidRichInfoRepo;
  // TODO when deleting the legacy pipeline move this to analytics package
  private final FirehoseService firehoseService;
  private final AppConfig appConfig;

  @Async
  public void updateDeviceAndGeoInformationFromHeader(String aid, Map<String, String> headers) {
    try {
      DeviceAndGeoInfo deviceAndGeoInfo = new DeviceAndGeoInfo(
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-mobile-viewer", "false")),
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-tablet-viewer", "false")),
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-smarttv-viewer", "false")),
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-desktop-viewer", "true")),
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-ios-viewer", "false")),
        Boolean.valueOf(headers.getOrDefault("cloudfront-is-android-viewer", "false")),
        headers.get("cloudfront-viewer-country"),
        headers.get("cloudfront-viewer-country-name"),
        headers.get("cloudfront-viewer-country-region"),
        headers.get("cloudfront-viewer-country-region-name"),
        headers.get("cloudfront-viewer-city"),
        headers.get("cloudfront-viewer-postal-code"),
        headers.get("cloudfront-viewer-time-zone"),
        Double.valueOf(headers.getOrDefault("cloudfront-viewer-latitude", "0.0")),
        Double.valueOf(headers.getOrDefault("cloudfront-viewer-longitude", "0.0")),
        headers.get("cloudfront-viewer-address")
      );

      String deviceAndGeoInfoJson = objectMapper.writeValueAsString(deviceAndGeoInfo);
      aidRichInfoRepo.upsertAidRichInfo(aid, deviceAndGeoInfoJson);
    } catch (Exception e) {
      log.error("Can't save device and geo info", e);
      Sentry.captureException(e);
    }
  }

  @Async
  public void transformAndSendEventToFirehose(InActivityLog activityLog) {
    try {
      // Converts the payload object to string to send it to firehose
      TypeReference<Map<String, Object>> typeRef = new TypeReference<>() {
      };
      Map<String, Object> map = objectMapper.convertValue(activityLog, typeRef);
      Object payload = map.get("payload");
      map.put("payload", objectMapper.writeValueAsString(payload));

      String streamPrefix = switch (appConfig.getActiveProfile().toLowerCase()) {
        case "prod" -> "prod_";
        case "staging" -> "staging_";
        // INFO if you want to test firehose from local return "staging_" below
//        case "dev" -> "staging_";
        default -> null;
      };

      if (streamPrefix == null) return;
      firehoseService.sendEventsToFirehose(streamPrefix, "repl1_activity", objectMapper.writeValueAsString(map));
    } catch (Exception e) {
      log.error("Something wrong while transforming data for backup", e);
      Sentry.captureException(e);
    }
  }

  // la -> log activity
  @RequestMapping(value = "/la", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, String> saveActivity(@RequestBody ReqActivityLog activities, @RequestHeader Map<String, String> headers) {
    ArrayList<Activity> activityLog = new ArrayList<>();
    ArrayList<ActivityDt> activityDtLog = new ArrayList<>();

    boolean richInfoAdded = false;
    for (InActivityLog log : activities.getLogs()) {
      transformAndSendEventToFirehose(log);

      ActivityBase activity = getActivityBase(log);

      // demo_opened is the first event that is always fired. During this event we store device and
      // geo information for each aid
      if (!richInfoAdded && StringUtils.equalsIgnoreCase(log.getEvent(), "demo_opened")) {
        updateDeviceAndGeoInformationFromHeader(log.getAid(), headers);
        richInfoAdded = true;
      }

      if (log.getEntityCategory() == LogForEntityCategory.ac) {
        assert activity instanceof Activity;
        activityLog.add((Activity) activity);
      } else {
        assert activity instanceof ActivityDt;
        ActivityDt dt = (ActivityDt) activity;
        activityDtLog.add(dt);
      }
    }

    activityRepo.saveAll(activityLog);
    activityDtRepo.saveAll(activityDtLog);


    return Map.of("status", "ok");
  }

  @NotNull
  private ActivityBase getActivityBase(InActivityLog log) {
    ActivityBase activity = switch (log.getEntityCategory()) {
      case ac -> new Activity();
      case acdt -> new ActivityDt();
    };

    activity.setEventTime(log.getEventTime());
    activity.setEncEntityId(log.getEntityId());
    activity.setEvent(log.getEvent());
    activity.setAid(log.getAid());
    activity.setIngestionTime(Timestamp.from(Instant.now()));
    activity.setTarget(log.getTarget());
    activity.setSid(log.getSid());
    activity.setMetric1(log.getOffset());
    activity.setTz(log.getTz());
    activity.setPayload(log.getPayload());
    return activity;
  }
}
