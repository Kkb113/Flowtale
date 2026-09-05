package com.sharefable.api.controller;

import com.sharefable.Routes;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.transport.resp.RespHealth;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @RequestMapping(value = Routes.HEALTH, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<RespHealth> health() {
    return ApiResp.<RespHealth>builder()
      .status(ApiResp.ResponseStatus.Success)
      .data(RespHealth.builder().build())
      .build();
  }

}
