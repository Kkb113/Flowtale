package com.sharefable.api.transport;

import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@GenerateTSDef
@SuperBuilder(toBuilder = true)
@Data
@EqualsAndHashCode(callSuper = true)
public class AudioTranscodingJobInfo extends JobProcessingInfo {
  public static final String DISCRIMINATOR = "TRANSCODE_AUDIO";
  private String sourceFilePath;
  private String processedFilePath;
  private AudioProcessingSub sub;
  @Builder.Default
  private String meta = "na";

  @Override
  public String getType() {
    return DISCRIMINATOR;
  }
}
