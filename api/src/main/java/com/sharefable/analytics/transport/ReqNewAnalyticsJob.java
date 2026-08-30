package com.sharefable.analytics.transport;

import com.sharefable.analytics.common.AnalyticsJobType;
import com.sharefable.analytics.common.ProcessingStatus;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.Data;

import java.sql.Timestamp;

@Data
@GenerateTSDef
public class ReqNewAnalyticsJob {
  private AnalyticsJobType jobType;

  private String jobKey;

  private ProcessingStatus jobStatus;

  @OptionalPropInTS
  private Timestamp lowWatermark;

  @OptionalPropInTS
  private Timestamp highWatermark;

  @OptionalPropInTS
  private Object jobData;
}
