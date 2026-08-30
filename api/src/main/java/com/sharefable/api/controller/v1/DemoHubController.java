package com.sharefable.api.controller.v1;

import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.Routes;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.EntityService;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.transport.req.ReqDemoHubPropUpdate;
import com.sharefable.api.transport.req.ReqDemoHubRid;
import com.sharefable.api.transport.req.ReqNewTour;
import com.sharefable.api.transport.req.ReqRenameGeneric;
import com.sharefable.api.transport.resp.RespCommonConfig;
import com.sharefable.api.transport.resp.RespDemoEntity;
import com.sharefable.api.transport.resp.RespUploadUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class DemoHubController {
  private final EntityService entityService;
  private final WorkspaceController wsController;


  @RequestMapping(value = Routes.CREATE_DEMO_HUB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> createNewDemoHub(@RequestBody ReqNewTour body, @AuthUser User user) {
    ReqNewTour req = body.normalizeDisplayName();
    RespDemoEntity tour = entityService.createNewEntity(req, user, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.RENAME_DEMO_HUB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> renameDemoHub(@RequestBody ReqRenameGeneric body, @AuthUser User user) {
    RespDemoEntity tour = entityService.renameEntity(body, user, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.UPDATE_DEMO_HUB_PROP, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> updateDemoHubProperty(@RequestBody ReqDemoHubPropUpdate body, @AuthUser User user) {
    RespDemoEntity tour = entityService.updateEntityProperties(body.getRid(), user, TopLevelEntityType.DEMO_HUB, body);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.GET_ALL_DEMO_HUB, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespDemoEntity>> getAllDemoHub(@AuthUser User user) {
    List<RespDemoEntity> tour = entityService.getAllEntityForOrg(user.getBelongsToOrg(), TourDeleted.ACTIVE, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<List<RespDemoEntity>>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.GET_DEMO_HUB, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> getDemoHub(@RequestParam("rid") String rid) {
    RespDemoEntity tour = entityService.getEntityByRid(rid, false, false, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(tour).build();
  }

  @RequestMapping(value = Routes.DELETE_DEMO_HUB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<RespDemoEntity>> deleteDemoHub(@RequestBody ReqDemoHubRid body, @AuthUser User user) {
    List<RespDemoEntity> respDemoEntities = entityService.removeEntity(body.rid(), user, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<List<RespDemoEntity>>builder().status(ApiResp.ResponseStatus.Success).data(respDemoEntities).build();
  }

  @RequestMapping(value = Routes.PUBLISH_DEMO_HUB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespDemoEntity> publishDemoHub(@RequestBody ReqDemoHubRid body, @AuthUser User user) {
    RespCommonConfig commonConfig = wsController.getCommonConfig().getData();
    RespDemoEntity respDemoEntity = entityService.publishEntity(body.rid(), user, commonConfig, TopLevelEntityType.DEMO_HUB);
    return ApiResp.<RespDemoEntity>builder().status(ApiResp.ResponseStatus.Success).data(respDemoEntity).build();
  }

  @RequestMapping(value = Routes.RECORD_EDIT_DEMO_HUB, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespUploadUrl> recordDemoHubEdits(@RequestParam("rid") String rid, @AuthUser User user) {
    RespUploadUrl respTours = entityService.getPreSignedUrlToUpdateDemoHub(rid, user);
    return ApiResp.<RespUploadUrl>builder().status(ApiResp.ResponseStatus.Success).data(respTours).build();
  }
}
