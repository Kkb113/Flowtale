package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.*;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.transport.*;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.javatuples.Pair;

import java.lang.reflect.InvocationTargetException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class RespDemoEntity extends ResponseBase {
  private static ObjectMapper mapper = new ObjectMapper();
  private Long id;
  private String rid;
  private String assetPrefixHash;
  private String displayName;
  private String description;
  private Timestamp lastPublishedDate;
  private Boolean onboarding;
  private Boolean inProgress;
  private RespUser createdBy;
  private String pubDataFileName;
  private String pubLoaderFileName;
  private String pubEditFileName;
  private String pubTourEntityFileName;
  private Map<String, Object> site;
  private Boolean responsive;
  private ClientLogClass logClass;
  private Responsiveness responsive2;
  private TourDeleted deleted;
  private TopLevelEntityType entityType;
  private EntityInfo info;
  private Timestamp lastInteractedAt;
  @JsonProperty(value = "owner")
  private Long belongsToOrg;
  @OptionalPropInTS
  private Object globalOpts;
  @OptionalPropInTS
  private TourSettings settings;
  @OptionalPropInTS
  private List<Dataset> datasets;

  public static RespDemoEntity from(DemoEntity demoEntity) {
    try {
      RespDemoEntity resp = (RespDemoEntity) Utils.fromEntityToTransportObject(demoEntity);

      S3Config.EntityFilesConfig entityFilesConfig = S3Config.getEntityFiles();
      resp.setPubDataFileName(entityFilesConfig.publishedDataFile().filename(demoEntity.getPublishedVersion()));
      resp.setPubLoaderFileName(entityFilesConfig.publishedLoaderFile().filename(demoEntity.getPublishedVersion()));
      resp.setPubEditFileName(entityFilesConfig.publishedEditFile().filename(demoEntity.getPublishedVersion()));
      resp.setPubTourEntityFileName(entityFilesConfig.publishedTourEntityFile().filename());
      resp.setLogClass(ClientLogClass.na);

      return resp;
    } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
             InvocationTargetException e) {
      log.error("Can't convert entity to transport object. Error: " + e.getMessage());
      Sentry.captureException(e);
      return Empty();
    }
  }

  public static RespDemoEntity from(DemoEntity demoEntity, EntityConfigKV entityConfigKV) {
    RespDemoEntity resp = from(demoEntity);
    resp.setGlobalOpts(entityConfigKV == null ? null : entityConfigKV.getConfigVal());
    return resp;
  }

  public static RespDemoEntity from(DemoEntity demoEntity, List<EntityConfigKV> entityConfigKV) {
    Pair<EntityConfigKV, List<Dataset>> separatedEntityConfig = separateEntityConfigKV(entityConfigKV);
    RespDemoEntity resp = from(demoEntity, separatedEntityConfig.getValue0());
    resp.setDatasets(separatedEntityConfig.getValue1());
    return resp;
  }

  public static Pair<EntityConfigKV, List<Dataset>> separateEntityConfigKV(List<EntityConfigKV> entityConfigKV) {
    EntityConfigKV globalOpts = entityConfigKV.stream().filter((entityConfig) -> entityConfig.getConfigType() == EntityConfigConfigType.GLOBAL_OPTS)
      .findFirst()
      .orElse(null);

    List<Dataset> publishedDatasets = entityConfigKV.stream()
      .filter(entityConfig -> entityConfig.getConfigType() == EntityConfigConfigType.DATASET)
      .map(entityConfig -> mapper.convertValue(entityConfig.getConfigVal(), Dataset.class))
      .filter(dataset -> dataset.getLastPublishedDate() != null)
      .toList();
    return Pair.with(globalOpts, publishedDatasets);
  }

  private static RespDemoEntity Empty() {
    return new RespDemoEntity();
  }
}
