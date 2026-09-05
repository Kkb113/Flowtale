package com.sharefable.api.config;

import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/** The workspace selector is untrusted until JWT validation and subsequent membership validation. */
public final class WorkspaceJwtDecoder implements JwtDecoder {
  private final JwtDecoder delegate;

  public WorkspaceJwtDecoder(JwtDecoder delegate) { this.delegate = delegate; }

  @Override
  public Jwt decode(String token) {
    OrgContext.clear();
    Long organization = null;
    int separator = token.indexOf(':');
    if (separator >= 0) {
      try {
        String selector = token.substring(0, separator);
        if (!selector.matches("[1-9][0-9]*")) throw new NumberFormatException();
        organization = Long.parseLong(selector);
        token = token.substring(separator + 1);
      } catch (NumberFormatException error) {
        throw new BadJwtException("Invalid workspace selector");
      }
    }
    Jwt jwt = delegate.decode(token);
    if (organization != null) OrgContext.setCurrentOrgId(organization);
    return jwt;
  }
}
