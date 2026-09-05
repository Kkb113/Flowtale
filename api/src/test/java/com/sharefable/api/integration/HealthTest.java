package com.sharefable.api.integration;

import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.transport.resp.RespHealth;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class HealthTest extends TestWithRunnerAndSetup {
  @SneakyThrows
  @Test
  void shouldRespondsToHealthCheck() {
    ApiResp<RespHealth> resp = sendRequest(Routes.HEALTH, HttpMethod.GET, RespHealth.class);
    Assertions.assertEquals(ApiResp.ResponseStatus.Success, resp.getStatus());
    Assertions.assertEquals("up", resp.getData().getStatus());
  }

  @ParameterizedTest
  @ValueSource(strings = {"/debug", "/handled", "/unhandled"})
  void diagnosticsPrototypesAreNotPublicRoutes(String path) throws Exception {
    mvc.perform(get(path)).andExpect(status().isNotFound());
  }
}
