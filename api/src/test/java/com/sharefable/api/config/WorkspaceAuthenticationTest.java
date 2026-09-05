package com.sharefable.api.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;

class WorkspaceAuthenticationTest {
  @AfterEach void clear() { OrgContext.clear(); }

  @ParameterizedTest
  @ValueSource(strings = {"Basic abc", "Bearer ", "Bearer a b", "Bearer -1:jwt", "Bearer 0:jwt", "Bearer 1:2:jwt"})
  void rejectsMalformedAuthorization(String header) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", header);
    assertThrows(OAuth2AuthenticationException.class, () -> new CustomBearerTokenResolver().resolve(request));
  }

  @Test void preservesSupportedWorkspacePrefix() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader("Authorization", "bearer 42:header.payload.signature");
    assertEquals("42:header.payload.signature", new CustomBearerTokenResolver().resolve(request));
  }

  @Test void appliesWorkspaceOnlyAfterJwtValidation() {
    OrgContext.setCurrentOrgId(99L);
    WorkspaceJwtDecoder decoder = new WorkspaceJwtDecoder(token -> {
      assertNull(OrgContext.getCurrentOrgId());
      assertEquals("jwt", token);
      return Jwt.withTokenValue(token).header("alg", "RS256").claim("sub", "fixture").build();
    });
    decoder.decode("42:jwt");
    assertEquals(42L, OrgContext.getCurrentOrgId());
    decoder.decode("jwt");
    assertNull(OrgContext.getCurrentOrgId());
  }

  @Test void invalidJwtCannotLeaveWorkspaceContext() {
    WorkspaceJwtDecoder decoder = new WorkspaceJwtDecoder(token -> { throw new BadJwtException("Invalid token"); });
    assertThrows(BadJwtException.class, () -> decoder.decode("42:invalid"));
    assertNull(OrgContext.getCurrentOrgId());
  }

  @Test void rejectsOverflowWithoutLoggingTheToken() {
    WorkspaceJwtDecoder decoder = new WorkspaceJwtDecoder(token -> { fail("Must not validate malformed scope"); return null; });
    assertThrows(BadJwtException.class, () -> decoder.decode("99999999999999999999:private-token"));
    assertNull(OrgContext.getCurrentOrgId());
  }
}
