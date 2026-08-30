package com.sharefable.api.controller.v1;

import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.ScreenService;
import com.sharefable.api.transport.req.*;
import com.sharefable.api.transport.resp.RespScreen;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class ScreenController {
  private final ScreenService screenService;

  @RequestMapping(value = Routes.NEW_SCREEN, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_SCREEN)")
  public ApiResp<RespScreen> newScreen(@RequestBody ReqNewScreen body, @AuthUser User user) {
    ReqNewScreen req = body.normalizeDisplayName();
    RespScreen resp = screenService.createNewScreen(req, user);
    return ApiResp.<RespScreen>builder().status(ApiResp.ResponseStatus.Success).data(resp).build();
  }

  @RequestMapping(value = Routes.CREATE_THUMBNAIL, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_SCREEN)")
  public ApiResp<RespScreen> createThumbnail(@RequestBody ReqThumbnailCreation body, @AuthUser User user) {
    RespScreen respScreen = screenService.createThumbnailFromImage(body, user);
    return ApiResp.<RespScreen>builder().status(ApiResp.ResponseStatus.Success).data(respScreen).build();
  }

  @RequestMapping(value = Routes.ASSOCIATE_SCREEN_TO_TOUR, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_SCREEN)")
  public ApiResp<RespScreen> assignScreenToTour(@RequestBody ReqScreenTour body, @AuthUser User user) {
    RespScreen respScreen = screenService.assignScreenToTour(body, user);
    return ApiResp.<RespScreen>builder().status(ApiResp.ResponseStatus.Success).data(respScreen).build();
  }

  @RequestMapping(value = Routes.COPY_SCREEN, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_SCREEN)")
  public ApiResp<RespScreen> copyScreen(@RequestBody ReqCopyScreen body, @AuthUser User user) {
    RespScreen respScreen = screenService.copyFromParentScreen(body, user);
    return ApiResp.<RespScreen>builder().data(respScreen).build();
  }

  @RequestMapping(value = Routes.GET_ALL_SCREENS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.READ_SCREEN)")
  public ApiResp<RespScreen[]> getAllScreensForOrg(@AuthUser User user) {
    Long orgId = user.getBelongsToOrg();
    List<RespScreen> allScreens = screenService.getAllScreensForOrg(orgId);
    return ApiResp.<RespScreen[]>builder().status(ApiResp.ResponseStatus.Success).data(allScreens.toArray(RespScreen[]::new)).build();
  }

  @RequestMapping(value = Routes.GET_SCREEN, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespScreen> getScreenByRId(@RequestParam("rid") String rId) {
    Optional<RespScreen> maybeScreen = screenService.getScreenByRid(rId);
    if (maybeScreen.isEmpty()) {
      throw new ResponseStatusException(NOT_FOUND, String.format("Unable to find screen with rid %s", rId));
    }

    return ApiResp.<RespScreen>builder().data(maybeScreen.get()).build();
  }

  @RequestMapping(value = Routes.RECORD_EL_EDIT, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespScreen> recordEdit(@RequestBody ReqRecordEdit body, @AuthUser User user) {
    RespScreen resp = screenService.updateEditForScreen(body, user);
    return ApiResp.<RespScreen>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.RENAME_SCREEN, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  //@PreAuthorize("hasAuthority(@Perm.WRITE_TOUR)")
  public ApiResp<RespScreen> renameScreen(@RequestBody ReqRenameGeneric body, @AuthUser User user) {
    ReqRenameGeneric nBody = body.normalizeDisplayName();
    RespScreen resp = screenService.renameScreen(nBody, user);
    return ApiResp.<RespScreen>builder().data(resp).build();
  }

  @RequestMapping(value = Routes.UPDATE_SCREEN_PROPERTY, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespScreen> renameTour(@RequestBody ReqUpdateScreenProperty body, @AuthUser User user) {
    RespScreen respScreen = screenService.updateScreenProperty(body, user);
    return ApiResp.<RespScreen>builder().data(respScreen).build();
  }
}
