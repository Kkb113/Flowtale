package com.sharefable.analytics.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.analytics.common.DeviceAndGeoInfo;
import com.sharefable.analytics.entity.AidRichInfo;
import com.sharefable.analytics.entity.MHouseLead;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import com.sharefable.api.transport.resp.ResponseBase;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespHouseLead extends ResponseBase {
  private String pkVal;
  private String pkField;
  private String aid;
  private Integer sessionCreated;
  private Integer timeSpentSec;
  private Timestamp lastInteractedAt;
  private Integer ctaClickRate;
  private Integer completionPercentage;
  private Object info;
  private DeviceAndGeoInfo richInfo;
  @OptionalPropInTS
  private LeadOwnerEntity owner;

  public static RespHouseLead from(MHouseLead houseLead, AidRichInfo info) {
    try {
      RespHouseLead respHouseLead = (RespHouseLead) Utils.fromEntityToTransportObject(houseLead);
      if (info != null) respHouseLead.setRichInfo(info.getInfo1());
      return respHouseLead;
    } catch (NoSuchMethodException | InvocationTargetException | InstantiationException | IllegalAccessException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespHouseLead from(MHouseLead houseLead, AidRichInfo info, DemoEntity owner) {
    RespHouseLead resp = from(houseLead, info);
    LeadOwnerEntity leadOwner = LeadOwnerEntity.builder()
      .rid(owner.getRid())
      .displayName(owner.getDisplayName()).build();
    resp.setOwner(leadOwner);
    return resp;
  }

  private static RespHouseLead Empty() {
    return new RespHouseLead();
  }
}
