package com.sharefable.api.controller.v1;

import com.sharefable.Routes;
import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.common.PublicationValidationException;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.entity.ApiKey;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.EntityService;
import com.sharefable.api.service.CreationMutationService;
import com.sharefable.api.service.WorkspaceService;
import com.sharefable.api.transport.EditTour;
import com.sharefable.api.transport.OnboardingTourForPrev;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.transport.req.*;
import com.sharefable.api.transport.resp.RespCommonConfig;
import com.sharefable.api.transport.resp.RespDemoEntity;
import com.sharefable.api.transport.resp.RespDemoEntityWithSubEntities;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class TourController {
  private final EntityService entityService;
  private final CreationMutationService creationMutations;
  private final WorkspaceController wsController;
  private final WorkspaceService wsService;
  private final AppSettings appSettings;

  @ExceptionHandler(PublicationValidationException.class)
  public org.springframework.http.ResponseEntity<java.util.Map<String, String>> publicationValidation(PublicationValidationException error) {
    return org.springframework.http.ResponseEntity.unprocessableEntity().body(java.util.Map.of("message", error.getMessage()));
  }

  @RequestMapping(value = Routes.GET_ALL_TOURS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.READ_TOUR)")
  public ApiResp<RespDemoEntity[]> getAllTours(@AuthUser User user) {
    Long orgId = user.getBelongsToOrg();
    List<RespDemoEntity> allTours = entityService.getAllEntityForOrg(orgId, TourDeleted.ACTIVE, TopLevelEntityType.TOUR);
    return ApiResp.<RespDemoEntity[]>builder().status(ApiResp.ResponseStatus.Success).data(allTours.toArray(RespDemoEntity[]::new)).build();
  }

  @RequestMapping(value = Routes.NEW_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity> newTour(@RequestBody ReqNewTour body, @AuthUser User user,
      @RequestHeader(value = "Idempotency-Key", required = false) String retryKey) {
    ReqNewTour req = body.normalizeDisplayName();
    RespDemoEntity tour = creationMutations.execute(retryKey, "tour-create", user, req, RespDemoEntity.class,
      () -> entityService.createNewEntity(req, user, TopLevelEntityType.TOUR));
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.GET_TOUR, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> getTourByRId(@RequestParam("rid") String rId,
      @RequestParam("s") Optional<Boolean> shouldGetScreens, @AuthUser User user) {
    RespDemoEntity tour = entityService.getDraftByRid(rId, shouldGetScreens.orElse(false), TopLevelEntityType.TOUR, user);
    return ApiResp.<RespDemoEntity>builder().data(tour).build();
  }

  @RequestMapping(value = Routes.GET_TOUR_BY_RID_INTERNAL, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> getTourByRidForService(@PathVariable("rid") String rid) {
    return ApiResp.<RespDemoEntity>builder()
      .data(entityService.getEntityByRid(rid, false, false, TopLevelEntityType.TOUR)).build();
  }

  @RequestMapping(value = Routes.GET_TOUR_BY_ID, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> getTourById(@PathVariable("id") Long id) {
    RespDemoEntity resp = entityService.getTourById(id);
    return ApiResp.<RespDemoEntity>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.RECORD_TOUR_EDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity> recordTourIndexEdit(@RequestBody ReqRecordEdit body, @AuthUser User user,
      @RequestHeader(value = "Idempotency-Key", required = false) String retryKey) {
    RespDemoEntity resp = creationMutations.execute(retryKey, "tour-index", user, body, RespDemoEntity.class,
      () -> entityService.updateEditForTour(body, user, EditTour.INDEX));
    return ApiResp.<RespDemoEntity>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.RECORD_TOUR_LOADER_EDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity> recordLoaderEdit(@RequestBody ReqRecordEdit body, @AuthUser User user) {
    RespDemoEntity resp = entityService.updateEditForTour(body, user, EditTour.LOADER);
    return ApiResp.<RespDemoEntity>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.RECORD_TOUR_EDIT_FILE, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity> recordGlobalEdit(@RequestBody ReqRecordEdit body, @AuthUser User user) {
    RespDemoEntity resp = entityService.updateEditForTour(body, user, EditTour.EDITS);
    return ApiResp.<RespDemoEntity>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.RENAME_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity> renameTour(@RequestBody ReqRenameGeneric body, @AuthUser User user) {
    ReqRenameGeneric nBody = body.normalizeDisplayName();
    RespDemoEntity resp = entityService.renameEntity(nBody, user, TopLevelEntityType.TOUR);
    return ApiResp.<RespDemoEntity>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.DUPLICATE_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  @Transactional
  public ApiResp<RespDemoEntityWithSubEntities> duplicateTour(@RequestBody ReqDuplicateTour body, @AuthUser User user,
      @RequestHeader(value = "Idempotency-Key", required = false) String retryKey) {
    ReqDuplicateTour nBody = body.normalizeDisplayName();
    RespDemoEntityWithSubEntities resp = creationMutations.execute(retryKey, "tour-duplicate", user, nBody,
      RespDemoEntityWithSubEntities.class, () -> entityService.duplicateTour(nBody, user));
    return ApiResp.<RespDemoEntityWithSubEntities>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.DELETE_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespDemoEntity[]> deleteTour(@RequestBody ReqTourRid body, @AuthUser User user) {
    List<RespDemoEntity> allTours = entityService.removeEntity(body.tourRid(), user, TopLevelEntityType.TOUR);
    return ApiResp.<RespDemoEntity[]>builder().status(ApiResp.ResponseStatus.Success).data(allTours.toArray(RespDemoEntity[]::new)).build();
  }

  @RequestMapping(value = Routes.PUBLISH_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> publishTour(@RequestBody ReqTourRid body, @AuthUser User user) {
    RespCommonConfig commonConfig = wsController.getCommonConfig().getData();
    RespDemoEntity resp = entityService.publishEntity(body.tourRid(), user, commonConfig, TopLevelEntityType.TOUR);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.PUBLISH_TOUR_INTERNAL, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> publishTour(@RequestBody ReqTourRid body) {
    if (!appSettings.isMigrationFlatSet()) {
      log.error("Migration requested but flag not set.");
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }
    RespCommonConfig commonConfig = wsController.getCommonConfig().getData();
    RespDemoEntity resp = entityService.publishEntity(body, commonConfig, TopLevelEntityType.TOUR);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.ONBOARDING_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntityWithSubEntities[]> getOnboardingTours(@AuthUser User user) {
    List<RespDemoEntityWithSubEntities> allOnboardingTours = entityService.createOnboardingTourInUserAccount(user);
    return ApiResp.<RespDemoEntityWithSubEntities[]>builder().status(ApiResp.ResponseStatus.Success).data(allOnboardingTours.toArray(RespDemoEntityWithSubEntities[]::new)).build();
  }

  @RequestMapping(value = Routes.ONBOARDING_TOUR_PREVIEW_ONLY, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<OnboardingTourForPrev>> getOnboardingToursForPreview(@AuthUser User user) {
    List<OnboardingTourForPrev> tourForPreview = entityService.getOnboardingToursForPreview(user);
    return ApiResp.<List<OnboardingTourForPrev>>builder().status(ApiResp.ResponseStatus.Success).data(tourForPreview).build();
  }

  @RequestMapping(value = Routes.UPDATE_TOUR_PROPERTY, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> updateTourProperty(@RequestBody ReqTourPropUpdate body, @AuthUser User user) {
    RespDemoEntity respDemoEntity = entityService.updateEntityProperties(body.getTourRid(), user, TopLevelEntityType.TOUR, body);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(respDemoEntity).build();
  }

  @RequestMapping(value = Routes.GET_TOUR_ASSET_FILE_PATH, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<String> getTourAssetPath(@RequestParam("id") Long tourId) {
    String assetPath = entityService.getAssetPathForTour(tourId);
    return ApiResp.<String>builder().status(ApiResp.ResponseStatus.Success).data(assetPath).build();
  }

  @RequestMapping(value = Routes.GET_ALL_TOURS_BY_API_KEY, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespDemoEntity>> getAllTours(@RequestHeader(name = "X-API-KEY") String apiKey) {
    ApiKey key = wsService.getApiKey(apiKey);
    if (key == null) {
      log.warn("API key authentication failed");
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }
    List<RespDemoEntity> allTours = entityService.getAllEntityForOrg(key.getOrg().getId(), TourDeleted.ACTIVE, TopLevelEntityType.TOUR);
    log.info("GET_ALL_TOURS_API_KEY  orgId {} len {}", key.getOrg().getId(), allTours.size());
    return ApiResp.<List<RespDemoEntity>>builder().status(ApiResp.ResponseStatus.Success).data(allTours).build();
  }

  @RequestMapping(value = Routes.COPY_TOUR_TO_DIFFERENT_ORG, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespDemoEntityWithSubEntities>> copyToursToDifferentOrg(@RequestBody ReqTransferTour body) {
    if (!appSettings.isMigrationFlatSet()) {
      log.error("Migration requested but flag not set.");
      throw new ResponseStatusException(HttpStatusCode.valueOf(404));
    }
    List<RespDemoEntityWithSubEntities> respDemoEntityWithScreens = entityService.copyToursToDifferentOrg(body);
    return ApiResp.<List<RespDemoEntityWithSubEntities>>builder().status(ApiResp.ResponseStatus.Success).data(respDemoEntityWithScreens).build();
  }
}
