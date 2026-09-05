package com.sharefable.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

/** Server-to-server routes are never authorized by possession of a resource ID. */
public class ServiceBoundaryFilter extends OncePerRequestFilter {
  private final byte[] secret;
  private static final Set<String> EXACT = Set.of("/v1/lock", "/v1/trasstpath", "/v1/poplead", "/v1/new/log",
    "/v1/refreshsettings", "/v1/nfhook", "/v1/vr/ct/forcecreatelinkedaccount");

  public ServiceBoundaryFilter(String secret) {
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  static boolean isInternal(String path) {
    return EXACT.contains(path) || path.startsWith("/v1/fat/") || path.startsWith("/v1/ide/")
      || path.startsWith("/v1/m/") || path.startsWith("/v1/repub/")
      || path.startsWith("/v1/tour/by/id/") || path.startsWith("/v1/tour/by/rid/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    OrgContext.clear();
    try {
      String path = request.getServletPath();
      if (path == null || path.isEmpty()) {
        path = request.getRequestURI().substring(request.getContextPath().length());
      }
      if (isInternal(path)) {
        String provided = request.getHeader("X-Fable-Service-Token");
        if (secret.length < 32 || provided == null
            || !MessageDigest.isEqual(secret, provided.getBytes(StandardCharsets.UTF_8))) {
          response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Service authentication required");
          return;
        }
      }
      chain.doFilter(request, response);
    } finally {
      OrgContext.clear();
    }
  }
}
