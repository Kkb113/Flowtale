package com.sharefable.api.controller.v1;

import com.sharefable.Routes;
import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.entity.LLMOps;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.LLMOpsService;
import com.sharefable.api.transport.req.ReqNewLLMRun;
import com.sharefable.api.transport.req.ReqUpdateLLMRun;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class LLMOpsController {
  private final LLMOpsService llmOpsService;

  @RequestMapping(value = Routes.NEW_LLM_RUN, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<LLMOps> createLLMRunRecord(@RequestBody ReqNewLLMRun body, @AuthUser User user) {
    LLMOps llmOps = llmOpsService.newLLMRun(body, user.getBelongsToOrg());
    return ApiResp.<LLMOps>builder().status(ApiResp.ResponseStatus.Success).data(llmOps).build();
  }

  @RequestMapping(value = Routes.UPDATE_LLM_RUN, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<LLMOps> updateLLMRun(@RequestBody ReqUpdateLLMRun body) {
    LLMOps ops = llmOpsService.updateRun(body);
    return ApiResp.<LLMOps>builder().status(ApiResp.ResponseStatus.Success).data(ops).build();
  }

  @RequestMapping(value = Routes.GET_LLM_RUNS, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<List<LLMOps>> getRuns(@PathVariable("thread_id") String threadId, @AuthUser User user) {
    threadId = URLDecoder.decode(threadId, StandardCharsets.UTF_8);
    List<LLMOps> ops = llmOpsService.getRuns(threadId, user.getBelongsToOrg());
    return ApiResp.<List<LLMOps>>builder().status(ApiResp.ResponseStatus.Success).data(ops).build();
  }
}
