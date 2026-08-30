package com.sharefable.api.transport.resp;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.JobProcessingStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@ToString
@SuperBuilder(toBuilder = true)
@GenerateTSDef
public class RespMediaProcessingInfo extends ResponseBase {
  private Long jobId;
  private String originalFilePath;
  private MediaType mediaType;
  private String processedFilePath;
  private String processedCdnPath;
  private JobProcessingStatus processingState;
  private String failureReason;
}
