package com.sharefable.api.config;

import com.sharefable.api.auth.AudienceValidator;
import com.sharefable.Routes;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;


@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  @Value("${auth0.audiences}")
  private String audience;
  @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
  private String issuer;

  @Bean
  JwtDecoder jwtDecoder() {
    NimbusJwtDecoder jwtDecoder = JwtDecoders.fromOidcIssuerLocation(issuer);
    OAuth2TokenValidator<Jwt> audienceValidator = new AudienceValidator(audience);
    OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
    OAuth2TokenValidator<Jwt> withAudience = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);
    jwtDecoder.setJwtValidator(withAudience);
    return token -> {
      try {
        String[] parts = token.split(":");
        if (parts.length == 2) {
          token = parts[1];
          OrgContext.setCurrentOrgId(Long.valueOf(parts[0]));
        }
      } catch (Exception e) {
        log.error("Something went wrong while splitting token", e);
        Sentry.captureException(e);
      }
      return jwtDecoder.decode(token);
    };
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .csrf().disable().cors()
      .and()
      .sessionManagement()
      .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      .and()
      .authorizeHttpRequests()
      .requestMatchers(Routes.API_V1 + Routes.__BEHIND_LOGIN__ + "/**")
      .fullyAuthenticated()
      .anyRequest()
      .permitAll()
      .and()
      .httpBasic(Customizer.withDefaults())
      .oauth2ResourceServer().bearerTokenResolver(customBearerTokenResolver())
      .jwt().decoder(jwtDecoder());
//      .jwtAuthenticationConverter(makePermissionsConverter());
    return http.build();
  }

  private BearerTokenResolver customBearerTokenResolver() {
    return new CustomBearerTokenResolver();
  }

  private JwtAuthenticationConverter makePermissionsConverter() {
    final var jwtAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
    jwtAuthoritiesConverter.setAuthoritiesClaimName("permissions");
    jwtAuthoritiesConverter.setAuthorityPrefix("");
    final var jwtAuthConverter = new JwtAuthenticationConverter();
    jwtAuthConverter.setJwtGrantedAuthoritiesConverter(jwtAuthoritiesConverter);
    return jwtAuthConverter;
  }
}
