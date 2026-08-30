package com.sharefable.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.*;
import com.sharefable.api.config.AppConfig;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.*;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.repo.SubscriptionRepo;
import com.sharefable.api.repo.UserRepo;
import com.sharefable.api.transport.*;
import com.sharefable.api.transport.req.*;
import com.sharefable.api.transport.resp.RespCommonConfig;
import com.sharefable.api.transport.resp.RespDemoEntity;
import com.sharefable.api.transport.resp.RespDemoEntityWithSubEntities;
import com.sharefable.api.transport.resp.RespUploadUrl;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Triple;
import org.javatuples.Pair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URL;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EntityService extends ServiceBase {
  private final static ObjectMapper objectMapper = new ObjectMapper();
  private final static String ONBOARDING_ERR_NO_TOUR_IDS = "This error is occurring because there may be no onboarding tour ids present in db while trying to create onboarding tours for an organisation";
  private final DemoEntityRepo demoEntityRepo;
  private final UserRepo userRepo;
  private final S3Config s3Config;
  private final ScreenService screenService;
  private final UserService userService;
  private final S3Service s3Service;
  private final AppConfig appConfig;
  private final AppSettings settings;
  private final ScreenRepo screenRepo;
  private final EntityConfigService entityConfigService;
  private final SubscriptionRepo subscriptionRepo;

  @Autowired
  public EntityService(
    DemoEntityRepo demoEntityRepo,
    UserRepo userRepo, AppSettings settings,
    S3Service s3Service,
    S3Config s3Config,
    ScreenRepo screenRepo,
    ScreenService screenService,
    UserService userService, AppConfig appConfig,
    EntityConfigService entityConfigService, SubscriptionRepo subscriptionRepo) {
    super(settings, s3Service, s3Config, screenRepo, demoEntityRepo);
    this.demoEntityRepo = demoEntityRepo;
    this.userRepo = userRepo;
    this.s3Config = s3Config;
    this.screenService = screenService;
    this.s3Service = s3Service;
    this.userService = userService;
    this.appConfig = appConfig;
    this.settings = settings;
    this.screenRepo = screenRepo;
    this.entityConfigService = entityConfigService;
    this.subscriptionRepo = subscriptionRepo;
  }

  @Transactional
  public List<RespDemoEntity> getAllEntityForOrg(Long orgId, TourDeleted deleted, TopLevelEntityType type) {
    List<DemoEntity> demoEntities = demoEntityRepo.findAllByBelongsToOrgAndDeletedAndEntityTypeEqualsOrderByUpdatedAtDesc(orgId, deleted, type);
    return demoEntities.stream().map(RespDemoEntity::from).collect(Collectors.toList());
  }

  @Transactional
  public List<DemoEntity> getAllPublishedEntity(Long orgId) {
    return demoEntityRepo.findAllByBelongsToOrgAndDeletedAndLastPublishedDateNotNull(orgId, TourDeleted.ACTIVE);
  }

  @Transactional
  public RespDemoEntity createNewEntity(ReqNewTour req, User createdByUser, TopLevelEntityType type) {
    String prefixHash = Utils.createUuidWord();
    if (type == TopLevelEntityType.TOUR) {
      uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.TOUR_INDEX);
      uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.TOUR_LOADER);
      uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.TOUR_EDITS);
    } else {
      uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.DEMO_HUB);
    }

    EntityInfo entityInfo = EntityInfo.builder()
      .frameSettings(FrameSettings.LIGHT)
      .build();

    DemoEntity demoEntity = DemoEntity.builder()
      .createdBy(createdByUser)
      .displayName(req.name())
      .description(req.description().orElse(""))
      .rid(Utils.createReadableId(req.name()))
      .inProgress(false)
      .responsive(false)
      .deleted(TourDeleted.ACTIVE)
      .responsive2(Responsiveness.NoChoice)
      .publishedVersion(0)
      .info(req.info().orElse(entityInfo))
      .assetPrefixHash(prefixHash)
      .belongsToOrg(createdByUser.getBelongsToOrg())
      .onboarding(false)
      .settings(req.settings().orElse(null))
      .entityType(type)
      .build();

    DemoEntity storedDemoEntity = demoEntityRepo.save(demoEntity);
    List<EntityConfigKV> entityConfigKV = getEntityConfigKV(demoEntity.getBelongsToOrg());
    return RespDemoEntity.from(storedDemoEntity, entityConfigKV);
  }

  @Transactional(readOnly = true)
  public RespDemoEntity getEntityByRid(String rid, boolean shouldGetScreens, boolean shouldGetDeletedTour, TopLevelEntityType type) {
    List<TourWithConfig> maybeTourWithConfig = demoEntityRepo.findTourWithConfigByRidAndDeletedAndEntityType(
      rid,
      shouldGetDeletedTour ? TourDeleted.DELETED : TourDeleted.ACTIVE,
      Set.of(EntityConfigConfigType.GLOBAL_OPTS, EntityConfigConfigType.DATASET),
      type
    );

    if (maybeTourWithConfig.isEmpty()) {
      log.error("Can't get tour by rid {}", rid);
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
    }

    DemoEntity demoEntity = maybeTourWithConfig.get(0).getDemoEntity();
    List<EntityConfigKV> entityConfigKVS = maybeTourWithConfig.stream().map(TourWithConfig::getEntityConfigKV).toList();
    if (shouldGetScreens && type != TopLevelEntityType.DEMO_HUB) {
      Set<Screen> screens = demoEntity.getScreens();
      demoEntity.setScreens(screens);
      return RespDemoEntityWithSubEntities.from(demoEntity, entityConfigKVS);
    }
    return RespDemoEntity.from(demoEntity, entityConfigKVS);
  }

  @Transactional
  public RespDemoEntity updateEditForTour(ReqRecordEdit body, User userEntity, EditTour fileTobeEdited) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, body.rid(), userEntity);

    S3Config.FileConfig fileConfig = switch (fileTobeEdited) {
      case LOADER -> S3Config.getEntityFiles().loaderFile();
      case EDITS -> S3Config.getEntityFiles().editFile();
      case INDEX -> S3Config.getEntityFiles().tourDataFile();
    };

    uploadDataFileToS3(
      body.editData(),
      demoEntity.getAssetPrefixHash(),
      fileConfig,
      S3Config.AssetType.Tour);

    demoEntity.setLastInteractedAt(Utils.getCurrentUtcTimestamp());
    DemoEntity updatedDemoEntity = demoEntityRepo.save(demoEntity);
    return RespDemoEntity.from(updatedDemoEntity);
  }

  @Transactional
  public RespDemoEntity renameEntity(ReqRenameGeneric body, User userEntity, TopLevelEntityType type) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, body.rid(), userEntity);
    String oldRid = demoEntity.getRid();
    String oldName = demoEntity.getDisplayName();
    String newName = body.newName();

    boolean isSame = Utils.compareDisplayName(oldName, newName);
    if (!isSame) demoEntity.setRid(Utils.createReadableId(newName));

    demoEntity.setDisplayName(newName);
    demoEntity.setDescription(body.description().isPresent() ? body.description().get() : demoEntity.getDescription());

    try {
      DemoEntity updatedDemoEntity = demoEntityRepo.save(demoEntity);
      if (demoEntity.getLastPublishedDate() != null) {
        if (type == TopLevelEntityType.TOUR) {
          uploadTourManifestToS3(updatedDemoEntity);
        }
        if (!isSame) modifyPublishedTourEntityPath(oldRid, updatedDemoEntity.getRid(), type);
      }

      return RespDemoEntity.from(updatedDemoEntity);
    } catch (Exception e) {
      log.error("Error while trying to publish tour", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while trying to rename the tour");
    }
  }

  private void modifyPublishedTourEntityPath(String oldRid, String newRid, TopLevelEntityType type) {
    AssetFilePath fromPubTourEntityFile = s3Config.getQualifiedPathFor(
      type == TopLevelEntityType.TOUR ? S3Config.AssetType.PublishedTour : S3Config.AssetType.PublishedDemoHub,
      oldRid,
      S3Config.getEntityFiles().publishedTourEntityFile().filename());
    AssetFilePath toPubTourEntityFile = s3Config.getQualifiedPathFor(
      type == TopLevelEntityType.TOUR ? S3Config.AssetType.PublishedTour : S3Config.AssetType.PublishedDemoHub,
      newRid,
      S3Config.getEntityFiles().publishedTourEntityFile().filename());
    s3Service.copy(fromPubTourEntityFile, toPubTourEntityFile);
  }

  @Transactional
  public RespDemoEntityWithSubEntities duplicateTour(ReqDuplicateTour body, User user) {
    DemoEntity fromDemoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, body.fromTourRid(), user);
    return this.duplicateTour(fromDemoEntity, user, tour -> tour.onboarding(false).displayName(body.duplicateTourName()).description(""), false);
  }

  private Triple<AssetFilePath, AssetFilePath, AssetFilePath> getAssetFilePathForTour(DemoEntity fromDemoEntity) {

    AssetFilePath fromTourDataFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Tour,
      fromDemoEntity.getAssetPrefixHash(),
      S3Config.getEntityFiles().tourDataFile().filename());
    AssetFilePath fromTourLoaderFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Tour,
      fromDemoEntity.getAssetPrefixHash(),
      S3Config.getEntityFiles().loaderFile().filename());
    AssetFilePath fromTourEditFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Tour,
      fromDemoEntity.getAssetPrefixHash(),
      S3Config.getEntityFiles().editFile().filename());

    return Triple.of(fromTourDataFilePath, fromTourLoaderFilePath, fromTourEditFilePath);
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public RespDemoEntityWithSubEntities duplicateTour(DemoEntity fromDemoEntity, User user, FnTourBuilder f, boolean shouldCloneParentScreens) {

    Triple<AssetFilePath, AssetFilePath, AssetFilePath> assetFilePaths = getAssetFilePathForTour(fromDemoEntity);

    String prefixHash = Utils.createUuidWord();
    copyDataFileToS3(assetFilePaths.getLeft(), prefixHash, DATA_FILE_TYPE.TOUR_INDEX);
    copyDataFileToS3(assetFilePaths.getMiddle(), prefixHash, DATA_FILE_TYPE.TOUR_LOADER);
    copyDataFileToS3(assetFilePaths.getRight(), prefixHash, DATA_FILE_TYPE.TOUR_EDITS);

    String rid = Utils.createReadableId(fromDemoEntity.getDisplayName()); // TODO rid would be different
    DemoEntity.DemoEntityBuilder<?, ?> tourBuilder = DemoEntity.builder()
      .assetPrefixHash(prefixHash)
      .belongsToOrg(fromDemoEntity.getBelongsToOrg())
      .rid(rid)
      .inProgress(true)
      .publishedVersion(0)
      .responsive(fromDemoEntity.getResponsive())
      .responsive2(fromDemoEntity.getResponsive2())
      .displayName(fromDemoEntity.getDisplayName())
      .description(fromDemoEntity.getDescription())
      .site(fromDemoEntity.getSite())
      .deleted(fromDemoEntity.getDeleted())
      .onboarding(fromDemoEntity.getOnboarding())
      .settings(fromDemoEntity.getSettings())
      .entityType(fromDemoEntity.getEntityType())
      .info(fromDemoEntity.getInfo())
      .createdBy(user);
    tourBuilder = f.apply(tourBuilder);
    DemoEntity demoEntity = tourBuilder.build();
    DemoEntity savedDemoEntity = demoEntityRepo.save(demoEntity);

    Set<Screen> sourceScreens = fromDemoEntity.getScreens();

    Map<Long, Long> oldAndNewParentScreenMap = new HashMap<>();
    if (shouldCloneParentScreens) {
      Set<Long> parentScreenIds = sourceScreens.stream().map(Screen::getParentScreenId).collect(Collectors.toSet());
      List<Screen> parentScreens = screenRepo.findAllByIdIn(parentScreenIds);
      for (Screen parentScreen : parentScreens) {
        Screen clonedParentScreen = screenService.cloneScreen(newParentScreen -> newParentScreen.demoEntities(Set.of()).parentScreenId(0L), parentScreen, user, savedDemoEntity, demoEntity.getBelongsToOrg());
        oldAndNewParentScreenMap.put(parentScreen.getId(), clonedParentScreen.getId());
      }
    }

    Set<Screen> clonedScreens = new HashSet<>(sourceScreens.size());
    Map<String, String> sourceAndClonedScreenIdMap = new HashMap<>(sourceScreens.size());
    for (Screen sourceScreen : sourceScreens) {
      Screen clonedScreen = screenService.cloneScreen(newSourceScreen ->
        newSourceScreen.parentScreenId(
          sourceScreen.getType() != ScreenType.SerDom ? 0L : shouldCloneParentScreens ? oldAndNewParentScreenMap.get(sourceScreen.getParentScreenId())
            : sourceScreen.getParentScreenId()), sourceScreen, user, savedDemoEntity, demoEntity.getBelongsToOrg());
      clonedScreens.add(clonedScreen);
      sourceAndClonedScreenIdMap.put(Long.toString(sourceScreen.getId()), Long.toString(clonedScreen.getId()));
    }
    DemoEntity.DemoEntityBuilder<?, ?> updatedTourBuilder = savedDemoEntity.toBuilder().screens(clonedScreens);
    DemoEntity updatedDemoEntity = updatedTourBuilder.build();
    List<EntityConfigKV> entityConfigKV = getEntityConfigKV(demoEntity.getBelongsToOrg());
    RespDemoEntityWithSubEntities resp = RespDemoEntityWithSubEntities.from(updatedDemoEntity, entityConfigKV);
    resp.setIdxm(Optional.of(sourceAndClonedScreenIdMap));


    return resp;

        /* =============================================================================================================
         * Tour duplication is a complex process and currently client has to play a role in it (for faster development)
         * 1. Server clones(duplicate) all the screens + Copy edit files of screens
         * 2. Create a duplicate tour
         * 3. Copy tour data (index.json) file for duplicated tour
         *
         * Now this should have been enough, but like things in reality, things are always more elaborate than it looks.
         * Tour data file contains screen id inside the json file for annotation map / hotspot etc. After creating
         * the duplicate all the screenId has been changed for the duplicated tour.
         *
         * Hence, we send the new tour information alongside, the screenId map that the client would use to change the
         * tour index file and make an edit record request. The reason we are not doing it in server is, server is very
         * transparent about the tour index data file, it has no information about it's construct etc.
         *
         * Client understand the construct hence it's easier for client to do this.
         *
         * The following code tried to do high level mutation to the tour data file. But not understanding construct
         * of tour data file made it difficult for the server to complete all the mutations.
         * =============================================================================================================

        try {
            String tourFileContent = new String(s3Service.getObjectContent(toTourFilePath), StandardCharsets.UTF_8);
            JsonNode rootNode = mapper.readTree(tourFileContent);
            JsonNode rootNodeCloned = rootNode.deepCopy();

            String v = rootNode.get("v").asText();
            if (StringUtils.equalsIgnoreCase(v, SchemaVersion.V1.toValue())) {
                JsonNode entities = rootNode.get("entities");

                Iterator<String> keyIterator = entities.fieldNames();
                while (keyIterator.hasNext()) {
                    String screenId = keyIterator.next();
                    String newScreenId = sourceAndClonedScreenIdMap.get(screenId);
                    ((ObjectNode) rootNodeCloned.get("entities")).remove(screenId);
                    ((ObjectNode) rootNodeCloned.get("entities")).set(newScreenId, entities.get(screenId));
                }

                s3Service.upload(
                    toTourFilePath,
                    rootNodeCloned.toString().getBytes(StandardCharsets.UTF_8),
                    Map.of()
                );
            } else {
                throw new IllegalStateException(String.format("Schema version %s not yet supported", v));
            }

        } catch (IOException | IllegalStateException e) {
            log.error("Error while reading duplicated tour's index file. Error {}", e.getMessage());
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "");
        }
        */
  }

  @Transactional
  public List<RespDemoEntity> removeEntity(String rid, User userEntity, TopLevelEntityType type) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, rid, userEntity);
    demoEntity.setDeleted(TourDeleted.DELETED);
    demoEntityRepo.save(demoEntity);
    return getAllEntityForOrg(userEntity.getBelongsToOrg(), TourDeleted.ACTIVE, type);
  }


  @Transactional
  public RespDemoEntity publishEntity(String rid, User userEntity, RespCommonConfig commonConfig, TopLevelEntityType entityType) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, rid, userEntity);
    return publishEntityBasedOnEntityType(demoEntity, commonConfig, entityType);
  }

  @Transactional
  protected RespDemoEntity publishEntityBasedOnEntityType(DemoEntity demoEntity, RespCommonConfig commonConfig, TopLevelEntityType entityType) {
    if (entityType == TopLevelEntityType.TOUR) {
      return copyDataForPublishTour(demoEntity, commonConfig);
    } else {
      return copyDataForPublishDemoHub(demoEntity, commonConfig);
    }
  }

  @Transactional
  public RespDemoEntity publishEntity(ReqTourRid body, RespCommonConfig commonConfig, TopLevelEntityType entityType) {
    Optional<DemoEntity> maybeTour = demoEntityRepo.findByRidAndDeletedAndEntityType(body.tourRid(), TourDeleted.ACTIVE, entityType);
    if (maybeTour.isEmpty()) throw new RuntimeException("entity not present");
    return publishEntityBasedOnEntityType(maybeTour.get(), commonConfig, entityType);
  }

  @Transactional
  public RespDemoEntity copyDataForPublishDemoHub(DemoEntity demoEntity, RespCommonConfig commonConfig) {
    try {
      AssetFilePath fromDemoHubDataFilePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.DemoHub,
        demoEntity.getAssetPrefixHash(),
        S3Config.getEntityFiles().demoHubDataFile().filename());

      Integer nextVersion = demoEntity.getPublishedVersion() + 1;
      AssetFilePath toDemoHubDataFilePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.DemoHub, demoEntity.getAssetPrefixHash(), S3Config.getEntityFiles().publishedDataFile().filename(nextVersion));

      s3Service.copy(fromDemoHubDataFilePath, toDemoHubDataFilePath, Map.of(
        HttpHeaders.CONTENT_TYPE, "application/json",
        HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().publishedDataFile().cachePolicy())
      ));
      return updateEntityAndUploadTos3(demoEntity, nextVersion, commonConfig);
    } catch (Exception e) {
      log.error("Error while trying to publish demo hub", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while trying to publish demo hub");
    }
  }

  @Transactional
  public Pair<Boolean, RespDemoEntity> refreshAndPublishEntityDataFile(String rid, RespCommonConfig commonConfig) {
    Optional<DemoEntity> maybeTour = demoEntityRepo.findByRidAndDeleted(rid, TourDeleted.ACTIVE);
    DemoEntity demoEntity = maybeTour.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (demoEntity.getLastPublishedDate() == null) {
      List<EntityConfigKV> entityConfigKV = getEntityConfigKV(demoEntity.getBelongsToOrg());
      RespDemoEntity respTour = RespDemoEntity.from(demoEntity, entityConfigKV);
      return Pair.with(false, respTour);
    }
    return Pair.with(true, updateEntityAndUploadTos3(demoEntity, demoEntity.getPublishedVersion(), commonConfig));
  }

  @Transactional
  public RespDemoEntity updateEntityAndUploadTos3(DemoEntity demoEntity, Integer nextVersion, RespCommonConfig commonConfig) {
    demoEntity.setLastPublishedDate(Utils.getCurrentUtcTimestamp());
    demoEntity.setPublishedVersion(nextVersion);

    List<EntityConfigKV> entityConfigKV = getEntityConfigKV(demoEntity.getBelongsToOrg());
    RespDemoEntityWithSubEntities respTour = RespDemoEntityWithSubEntities.from(demoEntity, commonConfig, entityConfigKV);

    // Based on subscription plan get log class
    Subscription sub = subscriptionRepo.getSubscriptionByOrgId(demoEntity.getBelongsToOrg());
    ClientLogClass logClass = switch (sub.getPaymentPlan()) {
      case SOLO, STARTUP, LIFETIME_TIER1, LIFETIME_TIER2 -> ClientLogClass.Basic;
      case LIFETIME_TIER3, LIFETIME_TIER4, LIFETIME_TIER5, BUSINESS -> ClientLogClass.Full;
    };
    respTour.setLogClass(logClass);
    ApiResp<RespDemoEntityWithSubEntities> apiResp = ApiResp.<RespDemoEntityWithSubEntities>builder().data(respTour).build();

    try {
      String tourResp = objectMapper.writeValueAsString(apiResp);
      uploadDataFileToS3(tourResp, demoEntity.getRid(), S3Config.getEntityFiles().publishedTourEntityFile(),
        demoEntity.getEntityType() == TopLevelEntityType.DEMO_HUB ? S3Config.AssetType.PublishedDemoHub : S3Config.AssetType.PublishedTour);

      DemoEntity savedDemoEntity = demoEntityRepo.save(demoEntity);
      return RespDemoEntity.from(savedDemoEntity, entityConfigKV);
    } catch (Exception e) {
      log.error("Error while trying to publish entity", e);
      throw new RuntimeException(e.getMessage());
    }
  }

  public RespUploadUrl getPreSignedUrlToUpdateDemoHub(String rid, User userEntity) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, rid, userEntity);

    AssetFilePath filePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.DemoHub,
      demoEntity.getAssetPrefixHash(),
      S3Config.getEntityFiles().demoHubDataFile().filename());
    URL url = s3Service.preSignedUrl(filePath, "application/json");
    log.warn("url {}", url);

    return RespUploadUrl.builder()
      .url(url.toString())
      .expiry("default")
      .filename(S3Config.getEntityFiles().demoHubDataFile().filename())
      .build();
  }

  @Transactional
  public RespDemoEntity copyDataForPublishTour(DemoEntity demoEntity, RespCommonConfig commonConfig) {
    Set<Screen> screens = demoEntity.getScreens();

    try {
      uploadTourManifestToS3(demoEntity);
      Triple<AssetFilePath, AssetFilePath, AssetFilePath> assetFilePaths = getAssetFilePathForTour(demoEntity);

      Integer nextVersion = demoEntity.getPublishedVersion() + 1;
      AssetFilePath toTourDataFilePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.Tour, demoEntity.getAssetPrefixHash(), S3Config.getEntityFiles().publishedDataFile().filename(nextVersion));
      AssetFilePath toTourLoaderFilePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.Tour, demoEntity.getAssetPrefixHash(), S3Config.getEntityFiles().publishedLoaderFile().filename(nextVersion));
      AssetFilePath toTourEditsFilePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.Tour, demoEntity.getAssetPrefixHash(), S3Config.getEntityFiles().publishedEditFile().filename(nextVersion));

      List<Callable<AssetFilePath>> tourInfoCopier = new ArrayList<>();
      Callable<AssetFilePath> tourDataCopier = () -> s3Service.copy(assetFilePaths.getLeft(), toTourDataFilePath, Map.of(
        HttpHeaders.CONTENT_TYPE, "application/json",
        HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().publishedDataFile().cachePolicy())
      ));
      Callable<AssetFilePath> tourLoaderCopier = () -> s3Service.copy(assetFilePaths.getMiddle(), toTourLoaderFilePath, Map.of(
        HttpHeaders.CONTENT_TYPE, "application/json",
        HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().publishedLoaderFile().cachePolicy())
      ));
      Callable<AssetFilePath> tourEditsCopier = () -> s3Service.copy(assetFilePaths.getRight(), toTourEditsFilePath, Map.of(
        HttpHeaders.CONTENT_TYPE, "application/json",
        HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().publishedEditFile().cachePolicy())
      ));

      tourInfoCopier.add(tourDataCopier);
      tourInfoCopier.add(tourLoaderCopier);
      tourInfoCopier.add(tourEditsCopier);

      for (Screen screen : screens) {
        if (screen.getType() != ScreenType.Img) {
          AssetFilePath fromScreenEditFilePath = s3Config.getQualifiedPathFor(
            S3Config.AssetType.Screen,
            screen.getAssetPrefixHash(),
            S3Config.getEntityFiles().editFile().filename());
          AssetFilePath toScreenEditFilePath = s3Config.getQualifiedPathFor(
            S3Config.AssetType.Screen,
            screen.getAssetPrefixHash(),
            S3Config.getEntityFiles().publishedEditFile().filename(nextVersion));

          Callable<AssetFilePath> screenEditCopier = () -> s3Service.copy(fromScreenEditFilePath, toScreenEditFilePath, Map.of(
            HttpHeaders.CONTENT_TYPE, "application/json",
            HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().publishedLoaderFile().cachePolicy())
          ));
          tourInfoCopier.add(screenEditCopier);
        }
      }
      Utils.runInParallel(tourInfoCopier.toArray(new Callable[0]));

      return updateEntityAndUploadTos3(demoEntity, nextVersion, commonConfig);
    } catch (Exception e) {
      log.error("Error while trying to publish tour", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while trying to publish tour");
    }
  }

  @Transactional
  @Async
  public void uploadTourManifestToS3(DemoEntity demoEntity) {
    TourManifest tourManifest = TourManifest.builder()
      .version(1)
      .name(demoEntity.getDisplayName())
      .url(appConfig.getUrlForDemo() + "/" + demoEntity.getRid())
      .build();
    List<ScreenAssets> screenAssets = new ArrayList<>();
    try {
      S3Config.PathConfigForClient pathConfigForClient = s3Config.getPathConfigForClient();
      String commonAssetPath = pathConfigForClient.commonAsset();
      for (Screen screen : demoEntity.getScreens()) {
        if (StringUtils.isBlank(screen.getThumbnail())) continue;
        ScreenAssets screenAsset = ScreenAssets.builder()
          .name(screen.getDisplayName())
          .url(screen.getUrl())
          .thumbnail(commonAssetPath + screen.getThumbnail())
          .icon(screen.getIcon())
          .build();
        screenAssets.add(screenAsset);
      }
      tourManifest.setScreenAssets(screenAssets);
      String tourScreenInfoAsString = objectMapper.writeValueAsString(tourManifest);
      AssetFilePath manifestPath = uploadDataFileToS3(tourScreenInfoAsString, demoEntity.getRid(), S3Config.getEntityFiles().manifestFile(), S3Config.AssetType.PublishedTour);
      // Currently gif creation runs into problem since the container size is pretty small it runs into oom
      // uncomment this code if gif creation is needed and oom is fixed.
      // mediaProcessingService.generateDemoGif(tour, manifestPath, s3Config.getQualifiedPathFor(S3Config.AssetType.PublishedTour, tour.getRid(), "demo.gif"));
    } catch (Exception e) {
      throw new RuntimeException("Something went wrong while sending tour screen info to s3 " + e.getMessage());
    }
  }

  private List<DemoEntity> getOnboardingTours() {
    String onboardingTourIds = settings.getOnboardingTourIds();
    if (onboardingTourIds != null && !StringUtils.isBlank(onboardingTourIds)) {
      List<Long> parsedOnboardingTourIds = Arrays.stream(settings.getOnboardingTourIds().trim().split(","))
        .map(Long::valueOf)
        .collect(Collectors.toList());
      return demoEntityRepo.findAllByIdIn(parsedOnboardingTourIds);
    }
    return null;
  }

  @Transactional(readOnly = true)
  public List<OnboardingTourForPrev> getOnboardingToursForPreview(User user) {
    List<DemoEntity> onboardingDemoEntities = getOnboardingTours();
    if (onboardingDemoEntities == null) return List.of();
    return onboardingDemoEntities.stream().map(tour -> new OnboardingTourForPrev(tour.getRid(), tour.getDisplayName(), tour.getDescription())).collect(Collectors.toList());
  }

  @Transactional
  public List<RespDemoEntityWithSubEntities> createOnboardingTourInUserAccount(User user) {
    List<RespDemoEntityWithSubEntities> respOnboardingTours = new ArrayList<>();
    try {
      List<DemoEntity> onboardingDemoEntities = getOnboardingTours();
      if (onboardingDemoEntities != null) {
        for (DemoEntity onboardingDemoEntity : onboardingDemoEntities) {
          respOnboardingTours.add(this.duplicateTour(onboardingDemoEntity, user,
            newTour -> newTour.onboarding(true).belongsToOrg(user.getBelongsToOrg()), true));
        }
      } else {
        log.error(ONBOARDING_ERR_NO_TOUR_IDS);
        Sentry.captureMessage(ONBOARDING_ERR_NO_TOUR_IDS);
      }
      return respOnboardingTours;
    } catch (Exception e) {
      log.error("Something went wrong while trying to create onboarding tours for an organisation", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while trying to create an onboarding tours for organisation");
    }
  }

  @Transactional
  public RespDemoEntity updateEntityProperties(String rid, User userEntity, TopLevelEntityType type, EntityUpdateBase body) {
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, rid, userEntity);

    if (!demoEntity.getEntityType().equals(type)) {
      log.warn("Trying to access different entity, requested {} but got {}", type, demoEntity.getEntityType());
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trying to access different entity, requested " + type + " but got " + demoEntity.getEntityType());
    }
    body.getSite().ifPresent(demoEntity::setSite);
    body.getInProgress().ifPresent(demoEntity::setInProgress);
    body.getResponsive().ifPresent(demoEntity::setResponsive);
    body.getResponsive2().ifPresent(demoEntity::setResponsive2);
    body.getSettings().ifPresent(demoEntity::setSettings);
    body.getInfo().ifPresent(demoEntity::setInfo);
    body.getLastInteractedAt().ifPresent(lastInteractedAt -> demoEntity.setLastInteractedAt(Utils.getCurrentUtcTimestamp()));
    DemoEntity savedDemoEntity = demoEntityRepo.save(demoEntity);
    return RespDemoEntity.from(savedDemoEntity);
  }

  @Transactional
  public String getAssetPathForTour(Long tourId) {
    Optional<DemoEntity> maybeTour = demoEntityRepo.findById(tourId);
    if (maybeTour.isEmpty()) {
      log.warn("Tour with id {} not found", tourId);
      return "";
    }
    AssetFilePath tourAssetFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Tour,
      maybeTour.get().getAssetPrefixHash(),
      S3Config.getEntityFiles().tourDataFile().filename());
    return tourAssetFilePath.getS3UriToFile();
  }

  @Transactional
  public RespDemoEntity getTourById(Long id) {
    List<TourWithConfig> maybeTourWithConfig = demoEntityRepo.findTourWithConfigById(id, Set.of(EntityConfigConfigType.GLOBAL_OPTS, EntityConfigConfigType.DATASET));
    DemoEntity demoEntity = maybeTourWithConfig.get(0).getDemoEntity();
    List<EntityConfigKV> entityConfigKVS = maybeTourWithConfig.stream().map(TourWithConfig::getEntityConfigKV).toList();
    return RespDemoEntity.from(demoEntity, entityConfigKVS);
  }

  @Transactional
  public List<RespDemoEntityWithSubEntities> copyToursToDifferentOrg(ReqTransferTour body) {
    try {
      Optional<User> maybeUser = userRepo.findUserByEmail(body.email());
      if (maybeUser.isEmpty()) {
        log.warn("User not present for email {} ", body.email());
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User not present for email");
      }

      User user = userService.setLatestOrgForUser(maybeUser.get(), body.orgId());

      List<RespDemoEntityWithSubEntities> copiedTours = new ArrayList<>();
      List<DemoEntity> allToursByRid = demoEntityRepo.findAllByRidInAndDeletedEquals(body.rids(), TourDeleted.ACTIVE);
      if (allToursByRid != null) {
        for (DemoEntity demoEntity : allToursByRid) {
          copiedTours.add(this.duplicateTour(demoEntity, user,
            newTour -> newTour.onboarding(false).inProgress(false).belongsToOrg(user.getBelongsToOrg()), true));
        }
      } else {
        log.warn("Provided rids are not present");
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Provided rids are not present");
      }
      return copiedTours;
    } catch (Exception e) {
      log.error("Something went wrong while copying tour to another org {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while copying tour to another org");
    }
  }

  @Transactional
  public List<EntityConfigKV> getEntityConfigKV(Long orgId) {
    return entityConfigService.getEntityConfigForAnOrg(ConfigEntityType.Org, orgId, Set.of(EntityConfigConfigType.GLOBAL_OPTS, EntityConfigConfigType.DATASET));
  }

  public List<String> lockOrUnlockDemosInAccount(ReqLockUnlockDemo req) {
    List<DemoEntity> demos = demoEntityRepo.findAllByBelongsToOrgAndDeleted(req.getOrgId(), TourDeleted.ACTIVE);
    List<DemoEntity> tobeChangedDemos = demos.stream().filter(d -> d.getInfo().isLocked() != req.isShouldLock()).toList();

    for (DemoEntity demo : tobeChangedDemos) {
      demo.getInfo().setLocked(req.isShouldLock());
    }
    Iterable<DemoEntity> savedDemos = demoEntityRepo.saveAll(tobeChangedDemos);
    List<String> savedDemoRids = new ArrayList<>(tobeChangedDemos.size());
    for (DemoEntity savedDemo : savedDemos) {
      savedDemoRids.add(savedDemo.getRid());
    }
    return savedDemoRids;
  }
}
