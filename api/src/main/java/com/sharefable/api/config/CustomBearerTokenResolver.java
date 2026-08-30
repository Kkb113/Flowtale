package com.sharefable.api.config;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

@Slf4j
public class CustomBearerTokenResolver implements BearerTokenResolver {
  private static final String BEARER_TOKEN_PREFIX = "Bearer ";
  private static final String AUTHORIZATION_HEADER = "Authorization";

  @Override
  public String resolve(HttpServletRequest request) {
    String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
    if (!StringUtils.isBlank(bearerToken)) {
      return StringUtils.substring(bearerToken, BEARER_TOKEN_PREFIX.length());
    }
    return null;
  }
}