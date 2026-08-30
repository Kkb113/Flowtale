package com.sharefable.api.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.app")
@NoArgsConstructor
@AllArgsConstructor
@Data
@Slf4j
public class AppConfig {
  private static final String PATH_TO_DEMO = "/live/demo";
  private String dns;

  @Value("${spring.profiles.active}")
  private String activeProfile;

  public String getUrlForDemo() {
    return dns + PATH_TO_DEMO;
  }
}
