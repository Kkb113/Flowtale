package com.sharefable.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.EditRevisionGuard;
import com.sharefable.api.common.FnScreenBuilder;
import com.sharefable.api.common.Utils;
import com.sharefable.api.common.ImageThumbnail;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.ScreenType;
import org.springframework.http.HttpHeaders;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.transport.req.*;
import com.sharefable.api.transport.resp.RespScreen;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ScreenService extends ServiceBase {
  private final ScreenRepo screenRepo;
  private final S3Config s3Config;
  private final S3Service s3Service;
  private final DemoEntityRepo demoEntityRepo;
  private final ProxyAssetDelivery proxyDelivery;
  ObjectMapper objectMapper = new ObjectMapper();

  @Autowired
  public ScreenService(ScreenRepo screenRepo, S3Service s3Service, S3Config s3Config, DemoEntityRepo demoEntityRepo, AppSettings settings,
      ProxyAssetDelivery proxyDelivery) {
    super(settings, s3Service, s3Config, screenRepo, demoEntityRepo);
    this.s3Service = s3Service;
    this.s3Config = s3Config;
    this.screenRepo = screenRepo;
    this.demoEntityRepo = demoEntityRepo;
    this.proxyDelivery = proxyDelivery;
  }

  @Transactional
  public RespScreen createNewScreen(ReqNewScreen req, User createdByUser) {
    String prefixHash = Utils.createUuidWord();
    Screen screen = Screen.builder()
      .rid(Utils.createReadableId(req.name()))
      .createdBy(createdByUser)
      .url(req.url().orElse(""))
      .displayName(req.name())
      .assetPrefixHash(prefixHash)
      .belongsToOrg(createdByUser.getBelongsToOrg())
      .icon(req.favIcon().orElse(""))
      .responsive(false)
      .parentScreenId(req.normalizedParentId())
      .build();

    if (req.type() == ScreenType.Img) {
      AssetFilePath assetFilePathForImgFile = s3Config.getQualifiedPathFor(S3Config.AssetType.Screen, prefixHash, S3Config.getEntityFiles().imgFile().filename());
      if (req.contentType().isEmpty()) {
        throw new ResponseStatusException(HttpStatus.NOT_ACCEPTABLE, "Image screen must have information about the content-type ");
      }

      try {
        URL presignedUrlToUploadImageScreen = s3Service.preSignedUrl(assetFilePathForImgFile, req.contentType().get());
        screen.setType(ScreenType.Img);
        String docTree = updateDocTree(req.body(), assetFilePathForImgFile.getS3UriToFile());

        // Persist the row only after its document exists, on the caller's transaction thread.
        // A background repository save would commit independently even if the upload failed.
        uploadDataFileToS3(docTree, prefixHash, S3Config.getEntityFiles().screenDataFile(), S3Config.AssetType.Screen);
        RespScreen respScreen = RespScreen.from(refreshPersisted(screenRepo.save(screen)));
        respScreen.setUploadUrl(Optional.ofNullable(presignedUrlToUploadImageScreen.toString()));
        return respScreen;
      } catch (JsonProcessingException e) {
        log.error("Something went wrong when updating image location on serialized json. Message: {}", e.getMessage());
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while saving screen");
      } catch (Exception e) {
        log.error("Something went wrong when saving a image screen. Message: {}", e.getMessage());
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while saving screen");
      }
    }

    Callable<Optional<AssetFilePath>> screenFileUploader =
      () -> Optional.ofNullable(uploadDataFileToS3(req.body(), prefixHash, S3Config.getEntityFiles().screenDataFile(), S3Config.AssetType.Screen));

    Callable<Optional<AssetFilePath>> thumbnailUploader =
      () -> uploadBase64ImageToS3(req.thumbnail().orElse(""), S3Config.AssetType.Common);

    try {
      List<Optional<AssetFilePath>> assetFiles = Utils.runInParallel(screenFileUploader, thumbnailUploader);
      Optional<AssetFilePath> thumbnailFile = assetFiles.get(1);

      String thumbnailFilePath = null;
      if (thumbnailFile.isPresent()) {
        thumbnailFilePath = thumbnailFile.get().getFilePath();
      }
      screen.setType(ScreenType.SerDom);
      screen.setThumbnail(thumbnailFilePath);
      Screen storedScreen = screenRepo.save(screen);
      return RespScreen.from(refreshPersisted(storedScreen));
    } catch (Exception e) {
      log.error("Error while uploading file to s3. Message: {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while saving screen");
    }
  }

  public void refreshCreationUploadUrl(RespScreen response, ReqNewScreen request, User user) {
    if (request.type() != ScreenType.Img) return;
    Screen screen = screenRepo.findByRid(response.getRid())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Screen not found"));
    validateEntityWithAuth(screen, screen.getRid(), user);
    AssetFilePath image = s3Config.getQualifiedPathFor(S3Config.AssetType.Screen,
      screen.getAssetPrefixHash(), S3Config.getEntityFiles().imgFile().filename());
    response.setUploadUrl(Optional.of(s3Service.preSignedUrl(image, request.contentType().orElseThrow()).toString()));
  }

  private String updateDocTree(String docTree, String imageScreenUrl) throws JsonProcessingException {
    return objectMapper.writeValueAsString(com.sharefable.api.common.ImageScreenDocument.withSource(
      objectMapper.readTree(docTree), imageScreenUrl));
  }

  @Transactional
  public RespScreen copyFromParentScreen(ReqCopyScreen body, User userEntity) {
    Long parentId = body.parentId();
    String tourRid = body.tourRid();

    DemoEntity destination = getDemoForAttachment(tourRid, userEntity);
    Optional<Screen> maybeScreen = screenRepo.findByIdForUpdate(parentId);

    if (maybeScreen.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, String.format("Screen with id %s not found", parentId));
    }

    Screen source = validateEntityWithAuth(maybeScreen.get(), maybeScreen.get().getRid(), userEntity);
    Screen clonedScreen = cloneScreen(newScreen -> newScreen, source, userEntity, destination);
    return RespScreen.from(refreshPersisted(clonedScreen));
  }


  @Transactional(propagation = Propagation.MANDATORY)
  public Screen cloneScreen(FnScreenBuilder screenBuilder, Screen sourceScreen, User user, DemoEntity demoEntity) {
    return cloneScreen(screenBuilder, sourceScreen, user, demoEntity, user.getBelongsToOrg());
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public Screen cloneScreen(FnScreenBuilder fnScreenBuilder, Screen sourceScreen, User user, DemoEntity demoEntity, Long belongsToOrg) {
    String prefixHash = Utils.createUuidWord();
    AssetFilePath fromScreenFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Screen,
      sourceScreen.getAssetPrefixHash(),
      S3Config.getEntityFiles().screenDataFile().filename());
    AssetFilePath fromThumbnailPath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Common, sourceScreen.getThumbnail());
    AssetFilePath fromScreenEditFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Screen,
      sourceScreen.getAssetPrefixHash(),
      S3Config.getEntityFiles().editFile().filename());
    AssetFilePath fromImgScreenFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Screen,
      sourceScreen.getAssetPrefixHash(),
      S3Config.getEntityFiles().imgFile().filename());

    AssetFilePath toScreenFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Screen, prefixHash, S3Config.getEntityFiles().screenDataFile().filename());
    AssetFilePath toThumbnailPath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Common, UUID.randomUUID().toString());
    AssetFilePath toImgScreenFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Screen, prefixHash, S3Config.getEntityFiles().imgFile().filename());

    Callable<AssetFilePath> screenFileCopier = sourceScreen.getType() == ScreenType.Img
      ? () -> s3Service.upload(toScreenFilePath, objectMapper.writeValueAsBytes(
        com.sharefable.api.common.ImageScreenDocument.withSource(
          objectMapper.readTree(s3Service.getObjectContent(fromScreenFilePath)), toImgScreenFilePath.getS3UriToFile())),
        Map.of(HttpHeaders.CONTENT_TYPE, "application/json", HttpHeaders.CACHE_CONTROL, "no-store"))
      : () -> s3Service.copy(fromScreenFilePath, toScreenFilePath);
    Callable<AssetFilePath> thumbnailCopier = () -> s3Service.copy(fromThumbnailPath, toThumbnailPath);
    Callable<AssetFilePath> imgFileCopier = () -> s3Service.copy(fromImgScreenFilePath, toImgScreenFilePath);
    Callable<AssetFilePath> editFileCopier = Utils.isParentScreen(sourceScreen)
      ? () -> uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.SCREEN_EDIT)
      : () -> copyDataFileToS3(fromScreenEditFilePath, prefixHash, DATA_FILE_TYPE.SCREEN_EDIT);

    try {
      if (!Objects.equals(sourceScreen.getBelongsToOrg(), belongsToOrg)) {
        proxyDelivery.copyAccess(objectMapper.readTree(s3Service.getObjectContent(fromScreenFilePath)),
          sourceScreen.getBelongsToOrg(), belongsToOrg);
        if (sourceScreen.getType() == ScreenType.SerDom && !Utils.isParentScreen(sourceScreen)) {
          proxyDelivery.copyAccess(objectMapper.readTree(s3Service.getObjectContent(fromScreenEditFilePath)),
            sourceScreen.getBelongsToOrg(), belongsToOrg);
        }
      }
      List<AssetFilePath> assetFiles = sourceScreen.getType() == ScreenType.SerDom
        ? Utils.runInParallel(screenFileCopier, thumbnailCopier, editFileCopier)
        : Utils.runInParallel(screenFileCopier, thumbnailCopier, imgFileCopier);
      AssetFilePath thumbnailFile = assetFiles.get(1);

      Screen.ScreenBuilder<?, ?> screenBuilder = Screen.builder()
        .rid(Utils.createReadableId(sourceScreen.getDisplayName()))
        .createdBy(user)
        .url(sourceScreen.getUrl())
        .displayName(sourceScreen.getDisplayName())
        .assetPrefixHash(prefixHash)
        .belongsToOrg(belongsToOrg)
        .icon(sourceScreen.getIcon())
        .responsive(sourceScreen.getResponsive())
        .thumbnail(thumbnailFile.getFilePath())
        .demoEntities(Set.of(demoEntity))
        .parentScreenId(Utils.isParentScreen(sourceScreen) ? sourceScreen.getId() : sourceScreen.getParentScreenId())
        .type(sourceScreen.getType());
      screenBuilder = fnScreenBuilder.apply(screenBuilder);
      Screen screen = screenBuilder.build();
      return screenRepo.save(screen);
    } catch (Exception e) {
      log.error("Error while copying file from parent screen to child screen. Message: {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
    }
  }

  @Transactional
  public RespScreen createThumbnailFromImage(ReqThumbnailCreation body, User user) {
    Screen screen = getScreenForMutation(body.screenRid(), user);

    String prefixHash = screen.getAssetPrefixHash();
    String base64Prefix = "data:image/jpeg;base64,";
    int newWidth = 360;
    int newHeight = 240;
    byte[] resizedImageBytes;
    AssetFilePath imgScreenFilePath = s3Config.getQualifiedPathFor(S3Config.AssetType.Screen, prefixHash, S3Config.getEntityFiles().imgFile().filename());

    try {
      byte[] imageContent = s3Service.getObjectContent(imgScreenFilePath);
      try {
        resizedImageBytes = ImageThumbnail.create(imageContent, newWidth, newHeight);
      } catch (IOException invalid) {
        throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
          "Upload a valid image within 32,768 pixels per side and 64 million pixels total.", invalid);
      }

      String base64StringOfThumbnail = base64Prefix + Base64.getEncoder().encodeToString(resizedImageBytes);
      Optional<AssetFilePath> uploadedThumbnailPath = uploadBase64ImageToS3(base64StringOfThumbnail, S3Config.AssetType.Common);
      if (uploadedThumbnailPath.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Can't save thumbnail in storage");
      }
      screen.setThumbnail(uploadedThumbnailPath.get().getFilePath());
      Screen storedScreen = screenRepo.save(screen);
      return RespScreen.from(refreshPersisted(storedScreen));
    } catch (ResponseStatusException e) {
      throw e;
    } catch (IOException e) {
      log.error("Something is wrong while getting the image from s3{}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while creating thumbnail");
    } catch (Exception e) {
      log.error("Something is wrong while resizing the image {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while creating thumbnail");
    }
  }

  @Transactional
  public RespScreen assignScreenToTour(ReqScreenTour body, User user) {
    DemoEntity demoEntity = getDemoForAttachment(body.tourRid(), user);
    Screen screen = getScreenForMutation(body.screenRid(), user);

    Set<DemoEntity> demoEntities = screen.getDemoEntities();
    demoEntities.add(demoEntity);
    screen.setDemoEntities(demoEntities);
    Screen storedScreen = screenRepo.save(screen);
    return RespScreen.from(refreshPersisted(storedScreen));
  }

  @Transactional
  public List<RespScreen> getAllScreensForOrg(Long orgId) {
    List<Screen> screens = screenRepo.findAllByBelongsToOrgOrderByUpdatedAtDesc(orgId);
    return screens.stream().map(RespScreen::from).collect(Collectors.toList());
  }

  @Transactional
  public Optional<RespScreen> getScreenByRid(String rid, User user) {
    Optional<Screen> maybeScreen = screenRepo.findByRid(rid);
    return maybeScreen.filter(screen -> user.getBelongsToOrg() != null
        && java.util.Objects.equals(screen.getBelongsToOrg(), user.getBelongsToOrg()))
      .map(RespScreen::from);
  }

  @Transactional
  public RespScreen updateEditForScreen(ReqRecordEdit body, User userEntity) {
    Screen screen = getScreenForMutation(body.rid(), userEntity);
    EditRevisionGuard.assertCurrent(screen.getUpdatedAt(), body.expectedRevision());

    uploadDataFileToS3(
      body.editData(),
      screen.getAssetPrefixHash(),
      S3Config.getEntityFiles().editFile(),
      S3Config.AssetType.Screen);

    // Updates the updatedAt
    screen.setUpdatedAt(Utils.getCurrentUtcTimestamp());
    Screen updatedScreen = screenRepo.save(screen);
    return RespScreen.from(refreshPersisted(updatedScreen));
  }

  @Transactional
  public RespScreen renameScreen(ReqRenameGeneric body, User userEntity) {
    Screen screen = getScreenForMutation(body.rid(), userEntity);
    String newName = body.newName();
    screen.setDisplayName(newName);
    screen.setRid(Utils.createReadableId(newName));
    Screen savedScreen = screenRepo.save(screen);
    return RespScreen.from(refreshPersisted(savedScreen));
  }

  @Transactional
  public RespScreen updateScreenProperty(ReqUpdateScreenProperty body, User userEntity) {
    Screen screen = getScreenForMutation(body.rid(), userEntity);
    if (body.propName().equals("responsive")) {
      screen.setResponsive((Boolean) body.propValue());
    }
    Screen updatedScreen = screenRepo.save(screen);
    return RespScreen.from(refreshPersisted(updatedScreen));
  }

  private Screen getScreenForMutation(String rid, User user) {
    return screenRepo.findByRidForUpdate(rid)
      .map(entity -> validateEntityWithAuth(entity, rid, user))
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Screen not found"));
  }

  private DemoEntity getDemoForAttachment(String rid, User user) {
    return demoEntityRepo.findByRidForUpdate(rid)
      .filter(entity -> entity.getDeleted() == TourDeleted.ACTIVE
        && entity.getEntityType() == com.sharefable.api.common.TopLevelEntityType.TOUR)
      .map(entity -> validateEntityWithAuth(entity, rid, user))
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demo not found"));
  }
}
