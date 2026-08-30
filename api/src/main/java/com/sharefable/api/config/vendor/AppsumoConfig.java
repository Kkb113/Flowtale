package com.sharefable.api.config.vendor;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.api.appsumo")
@NoArgsConstructor
@AllArgsConstructor
@Data
public class AppsumoConfig {
  private String clientSecret;
  private String clientId;
}
