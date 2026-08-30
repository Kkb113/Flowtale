package com.sharefable.api.config.vendor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.api.cblt")
@NoArgsConstructor
@AllArgsConstructor
@Data
@Slf4j
public class CobaltConfig {
  public static final String API_KEY = "x-api-key";
  public static final String LINKED_ACCOUNT_ID = "linked_account_id";
  private static final String TOKEN_URL = "https://api.gocobalt.io/api/v2/public/session-token";
  private static final String LIST_APP_URL = "https://api.gocobalt.io/api/v2/public/application";
  private static final String APP_EVENT_URL = "https://api.gocobalt.io/api/v1/webhook/651e859faa1edef92d87b200";
  private String apiKey;

  public String getTokenUrl() {
    return TOKEN_URL;
  }

  public String getListAppUrl() {
    return LIST_APP_URL;
  }

  public String getAppEventUrl() {
    return APP_EVENT_URL;
  }
}
