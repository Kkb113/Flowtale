package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@GenerateTSDef
public class ReqNewLLMRun {
  private String threadId;
  @OptionalPropInTS
  private Long entityId;
  private Object data;
  private Object meta;
}
