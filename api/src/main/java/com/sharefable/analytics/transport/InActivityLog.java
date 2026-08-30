package com.sharefable.analytics.transport;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;


@Data
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class InActivityLog {
  @JsonProperty("evtt")
  private Timestamp eventTime;

  @JsonProperty("eni")
  private Long entityId;

  @JsonProperty("ent")
  private TopLevelEntityType entityType;

  @JsonProperty("enc")
  private LogForEntityCategory entityCategory;

  private String event;

  @OptionalPropInTS
  private String target;

  private String aid;

  private String sid;

  private Integer offset;

  private String tz;

  private Object payload;
}
