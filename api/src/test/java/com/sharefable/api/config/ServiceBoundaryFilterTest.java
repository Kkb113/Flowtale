package com.sharefable.api.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

class ServiceBoundaryFilterTest {
  private static final String SECRET = "test-only-service-secret-with-at-least-32-bytes";

  @ParameterizedTest
  @ValueSource(strings = {"/v1/lock", "/v1/trasstpath", "/v1/poplead", "/v1/new/log", "/v1/refreshsettings",
    "/v1/nfhook", "/v1/fat/tenant_integration/1", "/v1/m/tpub", "/v1/repub/entity/rid/demo",
    "/v1/tour/by/id/1", "/v1/tour/by/rid/demo", "/v1/ide/refill_fable_credit/1"})
  void protectsInternalRoutes(String path) throws Exception {
    var request = new MockHttpServletRequest();
    request.setServletPath(path);
    var response = new MockHttpServletResponse();
    new ServiceBoundaryFilter(SECRET).doFilter(request, response, (req, res) -> fail("Unauthorized internal access"));
    assertEquals(401, response.getStatus());
  }

  @Test
  void permitsAuthenticatedServiceAndClearsWorkspaceContextOnException() {
    var request = new MockHttpServletRequest();
    request.setServletPath("/v1/lock");
    request.addHeader("X-Fable-Service-Token", SECRET);
    OrgContext.setCurrentOrgId(999L);
    assertThrows(IllegalStateException.class, () -> new ServiceBoundaryFilter(SECRET).doFilter(request,
      new MockHttpServletResponse(), (req, res) -> {
        assertNull(OrgContext.getCurrentOrgId());
        OrgContext.setCurrentOrgId(1L);
        throw new IllegalStateException("handler failed");
      }));
    assertNull(OrgContext.getCurrentOrgId());
  }

  @Test
  void leavesThePublicHealthRouteAvailable() throws Exception {
    var request = new MockHttpServletRequest();
    request.setServletPath("/v1/health");
    var called = new AtomicBoolean();
    new ServiceBoundaryFilter("").doFilter(request, new MockHttpServletResponse(), (req, res) -> called.set(true));
    assertTrue(called.get());
  }
}
