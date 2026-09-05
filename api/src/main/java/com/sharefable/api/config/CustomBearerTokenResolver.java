package com.sharefable.api.config;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.BearerTokenErrors;

@Slf4j
public class CustomBearerTokenResolver implements BearerTokenResolver {
  private static final String BEARER_TOKEN_PREFIX = "Bearer ";
  private static final String AUTHORIZATION_HEADER = "Authorization";

  @Override
  public String resolve(HttpServletRequest request) {
    String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
    if (!StringUtils.isBlank(bearerToken)) {
      if (!bearerToken.matches("(?i)^Bearer (?:[1-9][0-9]*:)?[a-zA-Z0-9._~+/-]+=*$")) {
        throw new OAuth2AuthenticationException(BearerTokenErrors.invalidRequest("Malformed bearer authorization"));
      }
      return StringUtils.substring(bearerToken, BEARER_TOKEN_PREFIX.length());
    }
    return null;
  }
}
