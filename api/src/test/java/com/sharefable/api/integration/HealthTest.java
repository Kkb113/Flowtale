package com.sharefable.api.integration;

import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.transport.resp.RespHealth;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

public class HealthTest extends TestWithRunnerAndSetup {
  @SneakyThrows
  @Test
  void shouldRespondsToHealthCheck() {
    ApiResp<RespHealth> resp = sendRequest(Routes.HEALTH, HttpMethod.GET, RespHealth.class);
    Assertions.assertEquals(ApiResp.ResponseStatus.Success, resp.getStatus());
    Assertions.assertEquals("up", resp.getData().getStatus());
  }
}
