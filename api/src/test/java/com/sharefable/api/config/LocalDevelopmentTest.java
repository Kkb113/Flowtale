package com.sharefable.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.oauth2.jwt.BadJwtException;
import static org.junit.jupiter.api.Assertions.*;

class LocalDevelopmentTest {
  private LocalDevelopmentConfig config(boolean enabled, String api, String client, String... profiles) {
    MockEnvironment environment = new MockEnvironment();
    environment.setActiveProfiles(profiles);
    return new LocalDevelopmentConfig(environment, enabled, api,
      "jdbc:postgresql://pg-analytics:5432/fable_analytics", "http://storage:8333",
      "http://queue:9324", client);
  }

  @Test void disabledByDefaultCannotConstructFixtureAuthentication() {
    var disabled = config(false, "jdbc:mysql://production/database", "https://app.example.com", "prod");
    assertFalse(disabled.isEnabled());
    assertThrows(IllegalStateException.class, () -> new LocalJwtDecoder(disabled));
  }

  @Test void refusesProductionOrMixedProfiles() {
    assertThrows(IllegalStateException.class, () -> config(true, "jdbc:mysql://db/database", "http://localhost:3000", "prod"));
    assertThrows(IllegalStateException.class, () -> config(true, "jdbc:mysql://db/database", "http://localhost:3000", "local", "prod"));
    assertThrows(IllegalStateException.class, () -> config(true, "jdbc:mysql://db/database", "http://localhost:3000", "dev"));
  }

  @Test void refusesRemoteDatabasesAndPublicClientOrigins() {
    assertThrows(IllegalStateException.class, () -> config(true, "jdbc:mysql://production/database", "http://localhost:3000", "local"));
    assertThrows(IllegalStateException.class, () -> config(true, "jdbc:mysql://db/database", "https://app.example.com", "local"));
  }

  @Test void issuesOnlyKnownLocalIdentitiesThroughTheSameWorkspaceDecoder() {
    var local = config(true, "jdbc:mysql://db/database", "http://localhost:3000", "local");
    var decoder = new WorkspaceJwtDecoder(new LocalJwtDecoder(local));
    try {
      var jwt = decoder.decode("42:fable-local-user-a-development-token-v1");
      assertEquals("local|user-a", jwt.getSubject());
      assertTrue(jwt.getClaimAsBoolean("email_verified"));
      assertEquals(42L, OrgContext.getCurrentOrgId());
      assertThrows(BadJwtException.class, () -> decoder.decode("42:unknown-local-account"));
      assertNull(OrgContext.getCurrentOrgId());
    } finally { OrgContext.clear(); }
  }

  @Test void refusesRemoteObjectStorageAndQueuesWithLocalIdentity() {
    MockEnvironment environment = new MockEnvironment();
    environment.setActiveProfiles("local");
    assertThrows(IllegalStateException.class, () -> new LocalDevelopmentConfig(environment, true,
      "jdbc:mysql://db/database", "jdbc:postgresql://pg-analytics/database",
      "https://s3.amazonaws.com", "http://queue:9324", "http://localhost:3000"));
    assertThrows(IllegalStateException.class, () -> new LocalDevelopmentConfig(environment, true,
      "jdbc:mysql://db/database", "jdbc:postgresql://pg-analytics/database",
      "http://storage:8333", "https://sqs.amazonaws.com", "http://localhost:3000"));
  }
}
