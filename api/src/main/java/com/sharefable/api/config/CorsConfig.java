package com.sharefable.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class CorsConfig implements WebMvcConfigurer {
  private final CleanupInterceptor cleanupInterceptor;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    // allow cors for all path for localhost and staging at this point in time
    registry.addMapping("/**")
//            .allowedOrigins(
//                "http://localhost:3000",
//                "https://app-staging.sharefable.com",
//                "https://app.sharefable.com",
//                "chrome-extension://**"
//            )
      .allowedOrigins("*")
      .allowedMethods("GET", "POST")
      .allowCredentials(false)
      .maxAge(3600);
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(cleanupInterceptor);
  }
}
