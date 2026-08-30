package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.SchemaVersion;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@SuperBuilder(toBuilder = true)
@GenerateTSDef
public class RespCommonConfig extends ResponseBase {
  private String commonAssetPath;
  private String screenAssetPath;
  private String tourAssetPath;
  private String demoHubAssetPath;
  private String pubDemoHubAssetPath;
  private String pubTourAssetPath;
  private String datasetAssetPath;
  private String dataFileName;
  private String loaderFileName;
  private String editFileName;
  private String manifestFileName;
  private String datasetFileName;
  private SchemaVersion latestSchemaVersion;
}
