package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.Utils;
import com.sharefable.api.entity.Org;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OrgInfo;
import io.sentry.Sentry;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
@Slf4j
@GenerateTSDef
@SuperBuilder(toBuilder = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RespOrg extends ResponseBase {
  private Long id;
  private String rid;
  private String displayName;
  private String thumbnail;
  private OrgInfo info;
  private RespUser createdBy;

  public static RespOrg from(Org org) {
    try {
      return (RespOrg) Utils.fromEntityToTransportObject(org);
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespOrg Empty() {
    return new RespOrg();
  }
}
