package com.sharefable.analytics.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.analytics.entity.MEntityMetrics;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.Builder;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
@Builder
public class RespEntityMetrics {
  private Long viewsUnique;
  private Long viewsAll;
  private Long conversion;

  public static RespEntityMetrics from(MEntityMetrics entityMetrics) {
    return new RespEntityMetrics(
      entityMetrics.getViewsUnique(),
      entityMetrics.getViewsAll(),
      entityMetrics.getConversion()
    );
  }


  public static RespEntityMetrics empty() {
    return new RespEntityMetrics(0L, 0L, 0L);
  }
}
