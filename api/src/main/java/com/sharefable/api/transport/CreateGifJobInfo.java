package com.sharefable.api.transport;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true)
@GenerateTSDef
@SuperBuilder(toBuilder = true)
@Data
public class CreateGifJobInfo extends JobProcessingInfo {
  public static final String DISCRIMINATOR = "CREATE_DEMO_GIF";

  private String manifestFilePath;

  private String gifFilePath;

  @Override
  public String getType() {
    return DISCRIMINATOR;
  }
}
