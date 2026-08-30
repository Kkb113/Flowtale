package com.sharefable.api.transport.req;

import com.sharefable.api.common.LLMOpsStatus;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class ReqUpdateLLMRun {
  private Long id;
  @OptionalPropInTS
  private LLMOpsStatus status;
  @OptionalPropInTS
  private Object data;
  @OptionalPropInTS
  private Object meta;
}
