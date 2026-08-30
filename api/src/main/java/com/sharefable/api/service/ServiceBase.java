package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.DefaultThumbnail;
import com.sharefable.api.common.ImageType;
import com.sharefable.api.common.Utils;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.EntityBaseWithOwnership;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.TourDeleted;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.javatuples.Pair;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
public abstract class ServiceBase implements DefaultThumbnail {
  private static final String PATH_TO_SCHEMA_FILE_FOR_TOUR_INDEX = "/data-schema/v=%s/tour/index.json";
  private static final String PATH_TO_SCHEMA_FILE_FOR_TOUR_LOADER = "/data-schema/v=%s/tour/loader.json";
  private static final String PATH_TO_SCHEMA_FILE_FOR_TOUR_EDITS = "/data-schema/v=%s/tour/edits.json";
  private static final String PATH_TO_SCHEMA_FILE_FOR_SCREEN_EDIT = "/data-schema/v=%s/screen/edits.json";
  private static final String PATH_TO_SCHEMA_FILE_FOR_DEMOHUB_INDEX = "/data-schema/v=%s/demoHub/index.json";
  private static final String PATH_TO_SCHEMA_FILE_FOR_DATASET = "/data-schema/v=%s/org/dataset.json";

  private final S3Service s3Service;
  private final S3Config s3Config;
  private final AppSettings settings;
  private final ScreenRepo screenRepo;
  private final DemoEntityRepo demoEntityRepo;

  protected ServiceBase(AppSettings settings, S3Service s3Service, S3Config s3Config, ScreenRepo screenRepo, DemoEntityRepo demoEntityRepo) {
    this.s3Service = s3Service;
    this.s3Config = s3Config;
    this.settings = settings;
    this.screenRepo = screenRepo;
    this.demoEntityRepo = demoEntityRepo;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<AssetFilePath> uploadBase64ImageToS3(String imageData, S3Config.AssetType assetType) {
    if (StringUtils.isBlank(imageData)) {
      imageData = THUMBNAIL_DATA;
    }
    Pair<byte[], ImageType> imgDataAndType = Utils.getImageDataFromBase64Str(imageData);

    if (imgDataAndType.getValue1() == ImageType.Unknown) {
      log.error("Can't find type from image data. Only allowed type is png. Skipping saving of image.");
      return Optional.empty();
    }

    String contentType = switch (imgDataAndType.getValue1()) {
      case PNG -> MediaType.IMAGE_PNG_VALUE;
      case JPEG -> MediaType.IMAGE_JPEG_VALUE;
      default -> MediaType.ALL_VALUE;
    };

    Map<String, String> userDefinedMetadata = new HashMap<>(1);
    userDefinedMetadata.put(HttpHeaders.CONTENT_TYPE, contentType);

    String filePath = UUID.randomUUID() + "." + imgDataAndType.getValue1().type;
    AssetFilePath assetFilePath = s3Config.getQualifiedPathFor(assetType, filePath);
    s3Service.upload(assetFilePath, imgDataAndType.getValue0(), userDefinedMetadata);
    return Optional.ofNullable(assetFilePath);
  }

  public TemplateFile getTemplateFileLocFor(DATA_FILE_TYPE type) {
    String schemaVersion = settings.getCurrentSchemaVersion().toValue();
    return switch (type) {
      case TOUR_INDEX -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_TOUR_INDEX, schemaVersion),
        S3Config.AssetType.Tour,
        S3Config.getEntityFiles().tourDataFile()
      );

      case TOUR_LOADER -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_TOUR_LOADER, schemaVersion),
        S3Config.AssetType.Tour,
        S3Config.getEntityFiles().loaderFile()
      );

      case SCREEN_EDIT -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_SCREEN_EDIT, schemaVersion),
        S3Config.AssetType.Screen,
        S3Config.getEntityFiles().editFile()
      );

      case DEMO_HUB -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_DEMOHUB_INDEX, schemaVersion),
        S3Config.AssetType.DemoHub,
        S3Config.getEntityFiles().demoHubDataFile()
      );

      case TOUR_EDITS -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_TOUR_EDITS, schemaVersion),
        S3Config.AssetType.Tour,
        S3Config.getEntityFiles().editFile()
      );

      case DATASET -> new TemplateFile(
        String.format(PATH_TO_SCHEMA_FILE_FOR_DATASET, schemaVersion),
        S3Config.AssetType.Dataset,
        // WARN for dataset template file cache policy is NoCache. Refer to the comment @ S3Config regarding [#dataset_caching]
        S3Config.getEntityFiles().datasetFile().overrideCachePolicy(S3Config.DATA_FILE_CACHE_POLICY.NoCache)
      );
    };
  }


  @Transactional(propagation = Propagation.MANDATORY)
  public AssetFilePath copyDataFileToS3(AssetFilePath fromEntityDataFile, String prefixHash, DATA_FILE_TYPE type) {
    TemplateFile tFile = getTemplateFileLocFor(type);
    AssetFilePath toEntityDataFile = s3Config.getQualifiedPathFor(tFile.type, prefixHash, tFile.toFile().filename());
    return s3Service.copy(fromEntityDataFile, toEntityDataFile);
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public AssetFilePath uploadTemplateFileToS3(String prefixHash, DATA_FILE_TYPE type) {
    TemplateFile tFile = getTemplateFileLocFor(type);
    String fileContent = getTemplateFileContent(tFile);
    return uploadDataFileToS3(fileContent, prefixHash, tFile.toFile(), tFile.type());
  }

  public AssetFilePath uploadTemplateFileToS3(AssetFilePath assetFilePath, DATA_FILE_TYPE type) {
    TemplateFile tFile = getTemplateFileLocFor(type);
    String fileContent = getTemplateFileContent(tFile);
    return uploadDataFileToS3(fileContent, assetFilePath, tFile.toFile());
  }

  public String getTemplateFileContent(TemplateFile tFile) {
    try (InputStream resourceAsStream = getClass().getResourceAsStream(tFile.fromPath())) {
      if (resourceAsStream == null) {
        log.error("No default data file is present while creating tour. Can't find schema file with path = {}", tFile.fromPath());
        throw new RuntimeException("Can't find schema file");
      }
      return IOUtils.toString(resourceAsStream, StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public AssetFilePath uploadDataFileToS3(String content, AssetFilePath assetFilePath, S3Config.FileConfig config) {
    Map<String, String> userDefinedMetadata = new HashMap<>(1);
    userDefinedMetadata.put(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
    userDefinedMetadata.put(HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(config.cachePolicy()));
    s3Service.upload(assetFilePath, content.getBytes(StandardCharsets.UTF_8), userDefinedMetadata);
    return assetFilePath;
  }

  public AssetFilePath uploadDataFileToS3(String content, String prefixHash, S3Config.FileConfig config, S3Config.AssetType assetType) {
    AssetFilePath assetFilePath = s3Config.getQualifiedPathFor(assetType, prefixHash, config.filename());
    return uploadDataFileToS3(content, assetFilePath, config);
  }

  public <T extends EntityBaseWithOwnership> T getEntityByRIdWithAuthValidation(Class<T> cls, String rid, User user) {
    Optional<? extends EntityBaseWithOwnership> maybeEntity;
    String entityType;
    if (cls.isAssignableFrom(Screen.class)) {
      maybeEntity = screenRepo.findByRid(rid);
      entityType = "screen";
    } else if (cls.isAssignableFrom(DemoEntity.class)) {
      maybeEntity = demoEntityRepo.findByRid(rid);
      entityType = "tour";
    } else {
      throw new IllegalArgumentException("{} not yet supported" + cls.getName());
    }

    if (maybeEntity.isEmpty()) {
      log.error("Can't update edit or retrieve analytics for {} {} as it's not found", entityType, rid);
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "");
    }

    if (entityType.equals("tour")) {
      DemoEntity demoEntity = (DemoEntity) maybeEntity.get();
      if (demoEntity.getDeleted() == TourDeleted.DELETED) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour with rid " + rid + " is not found");
      }
    }

    EntityBaseWithOwnership entity = maybeEntity.get();
    if (!Objects.equals(entity.getBelongsToOrg(), user.getBelongsToOrg())) {
      log.error("Can't update edit or retrieve analytics for {} {} as it's belong to different org. Requested by user {}, belongs to org {}",
        entityType, rid, user.getId(), entity.getBelongsToOrg());
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not enough permission");
    }
    return (T) entity;
  }

  public enum DATA_FILE_TYPE {
    TOUR_INDEX,
    TOUR_LOADER,
    TOUR_EDITS,
    SCREEN_EDIT,
    DEMO_HUB,
    DATASET
  }

  public record TemplateFile(String fromPath, S3Config.AssetType type, S3Config.FileConfig toFile) {
  }
}
