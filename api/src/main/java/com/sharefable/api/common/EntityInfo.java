package com.sharefable.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class EntityInfo {
  private String thumbnail;
  private FrameSettings frameSettings = FrameSettings.LIGHT;
  @OptionalPropInTS
  private boolean locked;
  @OptionalPropInTS
  private String annDemoId;
  @OptionalPropInTS
  private String threadId;
  @OptionalPropInTS
  private String productDetails;
  @OptionalPropInTS
  private String demoObjective;
  @OptionalPropInTS
  private Object demoRouter;
  @OptionalPropInTS
  private Boolean isVideo;
}
