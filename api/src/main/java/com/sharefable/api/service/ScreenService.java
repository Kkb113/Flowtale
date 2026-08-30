package com.sharefable.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.FnScreenBuilder;
import com.sharefable.api.common.Utils;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.transport.ScreenType;
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

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ScreenService extends ServiceBase {
  private final ScreenRepo screenRepo;
  private final S3Config s3Config;
  private final S3Service s3Service;
  private final DemoEntityRepo demoEntityRepo;
  ObjectMapper objectMapper = new ObjectMapper();

  @Autowired
  public ScreenService(ScreenRepo screenRepo, S3Service s3Service, S3Config s3Config, DemoEntityRepo demoEntityRepo, AppSettings settings) {
    super(settings, s3Service, s3Config, screenRepo, demoEntityRepo);
    this.s3Service = s3Service;
    this.s3Config = s3Config;
    this.screenRepo = screenRepo;
    this.demoEntityRepo = demoEntityRepo;
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

        CompletableFuture<Optional<AssetFilePath>> uploadDocTree = CompletableFuture.supplyAsync(() -> Optional.ofNullable(uploadDataFileToS3(docTree, prefixHash, S3Config.getEntityFiles().screenDataFile(), S3Config.AssetType.Screen)));
        CompletableFuture<Screen> saveScreen = CompletableFuture.supplyAsync(() -> screenRepo.save(screen));
        CompletableFuture<Void> combinedFuture = CompletableFuture.allOf(uploadDocTree, saveScreen);
        combinedFuture.join();

        RespScreen respScreen = RespScreen.from(saveScreen.join());
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
      return RespScreen.from(storedScreen);
    } catch (Exception e) {
      log.error("Error while uploading file to s3. Message: {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while saving screen");
    }
  }

  private String updateDocTree(String docTree, String imageScreenUrl) throws JsonProcessingException {
    JsonNode jsonNode = objectMapper.readTree(docTree);
    ((ObjectNode) jsonNode.path("docTree").path("chldrn").get(2).path("chldrn").get(1).path("attrs")).put("src", imageScreenUrl);
    return objectMapper.writeValueAsString(jsonNode);
  }

  @Transactional
  public RespScreen copyFromParentScreen(ReqCopyScreen body, User userEntity) {
    Long parentId = body.parentId();
    String tourRid = body.tourRid();

    Optional<Screen> maybeScreen = screenRepo.findById(parentId);
    Optional<DemoEntity> maybeTour = demoEntityRepo.findByRidAndDeletedEquals(tourRid, TourDeleted.ACTIVE);

    if (maybeScreen.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, String.format("Screen with id %s not found", parentId));
    }
    if (maybeTour.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, String.format("Tour with id %s not found", tourRid));
    }

    Screen clonedScreen = cloneScreen(newScreen -> newScreen, maybeScreen.get(), userEntity, maybeTour.get());
    return RespScreen.from(clonedScreen);
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

    Callable<AssetFilePath> screenFileCopier = () -> s3Service.copy(fromScreenFilePath, toScreenFilePath);
    Callable<AssetFilePath> thumbnailCopier = () -> s3Service.copy(fromThumbnailPath, toThumbnailPath);
    Callable<AssetFilePath> imgFileCopier = () -> s3Service.copy(fromImgScreenFilePath, toImgScreenFilePath);
    Callable<AssetFilePath> editFileCopier = Utils.isParentScreen(sourceScreen)
      ? () -> uploadTemplateFileToS3(prefixHash, DATA_FILE_TYPE.SCREEN_EDIT)
      : () -> copyDataFileToS3(fromScreenEditFilePath, prefixHash, DATA_FILE_TYPE.SCREEN_EDIT);

    try {
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
    Screen screen = getEntityByRIdWithAuthValidation(Screen.class, body.screenRid(), user);

    String prefixHash = screen.getAssetPrefixHash();
    String base64Prefix = "data:image/jpeg;base64,";
    int newWidth = 360;
    int newHeight = 240;
    byte[] resizedImageBytes;
    AssetFilePath imgScreenFilePath = s3Config.getQualifiedPathFor(S3Config.AssetType.Screen, prefixHash, S3Config.getEntityFiles().imgFile().filename());

    try {
      byte[] imageContent = s3Service.getObjectContent(imgScreenFilePath);
      ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(imageContent);
      BufferedImage originalImage = ImageIO.read(byteArrayInputStream);
      byteArrayInputStream.close();

      BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
      Graphics2D g = resizedImage.createGraphics();
      g.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
      g.dispose();

      ByteArrayOutputStream bos = new ByteArrayOutputStream();
      ImageIO.write(resizedImage, "jpeg", bos);
      resizedImageBytes = bos.toByteArray();
      bos.close();

      String base64StringOfThumbnail = base64Prefix + Base64.getEncoder().encodeToString(resizedImageBytes);
      Optional<AssetFilePath> uploadedThumbnailPath = uploadBase64ImageToS3(base64StringOfThumbnail, S3Config.AssetType.Common);
      if (uploadedThumbnailPath.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Can't save thumbnail in storage");
      }
      screen.setThumbnail(uploadedThumbnailPath.get().getFilePath());
      Screen storedScreen = screenRepo.save(screen);
      return RespScreen.from(storedScreen);
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
    Screen screen = getEntityByRIdWithAuthValidation(Screen.class, body.screenRid(), user);
    DemoEntity demoEntity = getEntityByRIdWithAuthValidation(DemoEntity.class, body.tourRid(), user);

    Set<DemoEntity> demoEntities = screen.getDemoEntities();
    demoEntities.add(demoEntity);
    screen.setDemoEntities(demoEntities);
    Screen storedScreen = screenRepo.save(screen);
    return RespScreen.from(storedScreen);
  }

  @Transactional
  public List<RespScreen> getAllScreensForOrg(Long orgId) {
    List<Screen> screens = screenRepo.findAllByBelongsToOrgOrderByUpdatedAtDesc(orgId);
    return screens.stream().map(RespScreen::from).collect(Collectors.toList());
  }

  @Transactional
  public Optional<RespScreen> getScreenByRid(String rid) {
    Optional<Screen> maybeScreen = screenRepo.findByRid(rid);
    return maybeScreen.map(RespScreen::from);
  }

  @Transactional
  public RespScreen updateEditForScreen(ReqRecordEdit body, User userEntity) {
    Screen screen = getEntityByRIdWithAuthValidation(Screen.class, body.rid(), userEntity);

    uploadDataFileToS3(
      body.editData(),
      screen.getAssetPrefixHash(),
      S3Config.getEntityFiles().editFile(),
      S3Config.AssetType.Screen);

    // Updates the updatedAt
    screen.setUpdatedAt(Utils.getCurrentUtcTimestamp());
    Screen updatedScreen = screenRepo.save(screen);
    return RespScreen.from(updatedScreen);
  }

  @Transactional
  public RespScreen renameScreen(ReqRenameGeneric body, User userEntity) {
    Screen screen = getEntityByRIdWithAuthValidation(Screen.class, body.rid(), userEntity);
    String newName = body.newName();
    screen.setDisplayName(newName);
    screen.setRid(Utils.createReadableId(newName));
    Screen savedScreen = screenRepo.save(screen);
    return RespScreen.from(savedScreen);
  }

  @Transactional
  public RespScreen updateScreenProperty(ReqUpdateScreenProperty body, User userEntity) {
    Screen screen = getEntityByRIdWithAuthValidation(Screen.class, body.rid(), userEntity);
    if (body.propName().equals("responsive")) {
      screen.setResponsive((Boolean) body.propValue());
    }
    Screen updatedScreen = screenRepo.save(screen);
    return RespScreen.from(updatedScreen);
  }
}
