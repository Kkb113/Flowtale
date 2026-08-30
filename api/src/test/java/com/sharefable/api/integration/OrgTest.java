package com.sharefable.api.integration;

import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.transport.req.ReqNewOrg;
import com.sharefable.api.transport.req.ReqUpdateGlobalOpts;
import com.sharefable.api.transport.resp.RespGlobalOpts;
import com.sharefable.api.transport.resp.RespOrg;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

import java.util.Map;

import static org.mockito.Mockito.when;

public class OrgTest extends TestWithRunnerAndSetup {
  @SneakyThrows
  @Test
  void testNewOrgCreationWithoutThumbnail() {
    when(appSettings.getGlobalOpts()).thenReturn(Map.of(
      "annConPad", "14 14",
      "showStepNo", true
    ));
    ReqNewOrg newOrgReq = new ReqNewOrg("Acme", null);

    String str = mapToJson(newOrgReq);
    ApiResp<RespOrg> newOrgResp = sendRequest(
      Routes.API_V1 + Routes.NEW_ORG,
      HttpMethod.POST,
      str,
      RespOrg.class
    );

    RespOrg org = newOrgResp.getData();

    Assertions.assertEquals("Acme", org.getDisplayName());
    Assertions.assertTrue(StringUtils.startsWith(org.getRid(), "acme-"), "Received rid=" + org.getRid());

    ApiResp<RespGlobalOpts> globalOptsResp = sendRequest(
      Routes.API_V1 + Routes.GET_GLOBAL_OPTS,
      HttpMethod.GET,
      RespGlobalOpts.class
    );
    Assertions.assertEquals(
      "14 14",
      ((Map<?, ?>) globalOptsResp.getData().getGlobalOpts()).get("annConPad")
    );

    Map<String, Object> updatedGlobalOpts = Map.of(
      "annConPad", "18 20",
      "showStepNo", false
    );
    ReqUpdateGlobalOpts updateGlobalOptsReq = new ReqUpdateGlobalOpts(mapToJson(updatedGlobalOpts));
    ApiResp<RespGlobalOpts> updatedGlobalOptsResp = sendRequest(
      Routes.API_V1 + Routes.UPDATE_GLOBAL_OPTS,
      HttpMethod.POST,
      mapToJson(updateGlobalOptsReq),
      RespGlobalOpts.class
    );
    Assertions.assertEquals(
      "18 20",
      ((Map<?, ?>) updatedGlobalOptsResp.getData().getGlobalOpts()).get("annConPad")
    );

//        ApiResp<RespOrg> getOrgResp = sendRequest(Routes.API_V1 + Routes.GET_ORG + "?rid=" + org.getRid(), HttpMethod.GET, RespOrg.class);
//        Assertions.assertEquals(ApiResp.ResponseStatus.Success, newOrgResp.getStatus());
//        RespOrg org2 = getOrgResp.getData();
//
//        Assertions.assertEquals(org, org2, "Org=" + org + "Org2=" + org2);
  }
}
