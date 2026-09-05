package com.sharefable.api.config;

import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import java.time.Instant;
import java.util.Map;

/** Public fixture credentials. Never constructed without the validated local development profile. */
public final class LocalJwtDecoder implements JwtDecoder {
  private static final Map<String, String> ACCOUNTS = Map.of(
    "fable-local-user-a-development-token-v1", "user-a",
    "fable-local-user-b-development-token-v1", "user-b"
  );

  public LocalJwtDecoder(LocalDevelopmentConfig config) {
    if (!config.isEnabled()) throw new IllegalStateException("Local authentication is disabled");
  }

  @Override
  public Jwt decode(String token) {
    String account = ACCOUNTS.get(token);
    if (account == null) throw new BadJwtException("Unknown local fixture account");
    Instant now = Instant.now();
    return Jwt.withTokenValue(token).header("alg", "local-fixture")
      .subject("local|" + account).issuedAt(now).expiresAt(now.plusSeconds(3600))
      .claim("email_verified", true)
      .claim("https://identity.sharefable.com/user", Map.of(
        "email", account + "@fable.local", "picture", "", "givenName", "Local", "familyName", account
      )).build();
  }
}
