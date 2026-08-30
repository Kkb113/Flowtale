package com.sharefable.api.integration;

import com.sharefable.api.common.ApiResp;
import com.sharefable.Routes;
import com.sharefable.api.transport.req.ReqNewOrg;
import com.sharefable.api.transport.resp.RespOrg;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

public class OrgTest extends TestWithRunnerAndSetup {
  @SneakyThrows
  @Test
  void testNewOrgCreationWithoutThumbnail() {
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

//        ApiResp<RespOrg> getOrgResp = sendRequest(Routes.API_V1 + Routes.GET_ORG + "?rid=" + org.getRid(), HttpMethod.GET, RespOrg.class);
//        Assertions.assertEquals(ApiResp.ResponseStatus.Success, newOrgResp.getStatus());
//        RespOrg org2 = getOrgResp.getData();
//
//        Assertions.assertEquals(org, org2, "Org=" + org + "Org2=" + org2);
  }
}
