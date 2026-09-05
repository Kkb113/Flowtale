package com.sharefable.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.util.Arrays;
import java.util.Set;

/** Local identity may only be paired with the isolated development services. */
@Component
public class LocalDevelopmentConfig {
  private final boolean enabled;

  public LocalDevelopmentConfig(Environment environment,
      @Value("${com.sharefable.local.enabled:false}") boolean enabled,
      @Value("${spring.datasource.api.url}") String apiDatabase,
      @Value("${spring.datasource.analytics.url}") String analyticsDatabase,
      @Value("${com.sharefable.api.s3.endpoint:}") String storageEndpoint,
      @Value("${com.sharefable.api.q.endpoint:}") String queueEndpoint,
      @Value("${com.sharefable.app.dns:}") String clientEndpoint) {
    this.enabled = enabled;
    if (!enabled) return;
    if (!Arrays.equals(environment.getActiveProfiles(), new String[]{"local"})) {
      throw new IllegalStateException("Local development authentication requires the exclusive local profile");
    }
    requireLocal(apiDatabase.replaceFirst("^jdbc:", ""), Set.of("db", "localhost", "127.0.0.1", "[::1]"));
    requireLocal(analyticsDatabase.replaceFirst("^jdbc:", ""), Set.of("pg-analytics", "localhost", "127.0.0.1", "[::1]"));
    requireLocal(storageEndpoint, Set.of("storage", "localhost", "127.0.0.1", "[::1]"));
    requireLocal(queueEndpoint, Set.of("queue", "localhost", "127.0.0.1", "[::1]"));
    requireLocal(clientEndpoint, Set.of("localhost", "127.0.0.1", "[::1]"));
  }

  private static void requireLocal(String endpoint, Set<String> hosts) {
    try {
      URI uri = URI.create(endpoint);
      if (uri.getHost() == null || !hosts.contains(uri.getHost()) || uri.getUserInfo() != null) throw new IllegalArgumentException();
    } catch (IllegalArgumentException error) {
      throw new IllegalStateException("Local development requires local databases, storage, queues and a loopback client origin");
    }
  }

  public boolean isEnabled() { return enabled; }
}
