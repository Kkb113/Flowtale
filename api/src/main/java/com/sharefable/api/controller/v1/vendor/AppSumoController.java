package com.sharefable.api.controller.v1.vendor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.ForObjectType;
import com.sharefable.api.common.LogType;
import com.sharefable.api.config.AppConfig;
import com.sharefable.Routes;
import com.sharefable.api.config.vendor.AppsumoConfig;
import com.sharefable.api.entity.Subscription;
import com.sharefable.api.service.LogService;
import com.sharefable.api.service.SubscriptionService;
import com.sharefable.api.service.vendor.SlackMsgService;
import com.sharefable.api.transport.PaymentTerms;
import com.sharefable.api.transport.ReqNewLog;
import com.sharefable.api.transport.req.ReqSubscriptionInfo;
import io.sentry.Sentry;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping(Routes.API_V1)
@Slf4j
@RequiredArgsConstructor
public class AppSumoController {
//  private static final String clientId = "APPSUMO_CLIENT_ID_PLACEHOLDER";
//  private static final String clientSecret = "APPSUMO_CLIENT_SECRET_PLACEHOLDER";
  private final RestTemplate restClient;
  private final ObjectMapper mapper = new ObjectMapper();
  private final LogService logService;
  private final SubscriptionService subscriptionService;
  private final SlackMsgService slackMsgService;
  private final AppConfig appConfig;
  private final AppsumoConfig appsumoConfig;

  @PostConstruct
  private void init() {
    DefaultUriBuilderFactory defaultUriBuilderFactory = new DefaultUriBuilderFactory();
    defaultUriBuilderFactory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);
    this.restClient.setUriTemplateHandler(defaultUriBuilderFactory);
  }

  @RequestMapping(value = Routes.APP_SUMO_WEBHOOK, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public WebhookResp webhook(
    HttpServletRequest request
  ) throws IOException {
    String bodyStr = IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);
    log.info("Received webhook from AppSumo {}", bodyStr);

    TypeReference<Map<String, Object>> typeRef = new TypeReference<>() {
    };
    Map<String, Object> body = mapper.readValue(bodyStr, typeRef);
    slackMsgService.sendAppSumoSubsMsgs(body);
    String currentLicenseKey = (String) body.get("license_key");
    String event = (String) body.get("event");
    if (!StringUtils.isBlank(currentLicenseKey)) {
      ReqNewLog logLine = new ReqNewLog(
        0L,
        LogType.SUBSCRIPTION,
        ForObjectType.LIFETIME_LICENSE_KEY,
        0L,
        Optional.of(currentLicenseKey),
        body
      );
      logService.appendNewLogLine(logLine);
      String lookupLicenseKey = currentLicenseKey;
      if (StringUtils.equalsIgnoreCase(event, "upgrade") || StringUtils.equalsIgnoreCase(event, "downgrade")) {
        lookupLicenseKey = (String) body.get("prev_license_key");
      }
      Subscription subs = subscriptionService.getSubscriptionById(lookupLicenseKey);
      if (subs != null) {
        log.info("Updating subscription based on appsumo license");
        ReqSubscriptionInfo subInfo = new ReqSubscriptionInfo(
          PaymentTerms.Plan.LIFETIME_TIER1, // placeholder
          PaymentTerms.Interval.LIFETIME,
          currentLicenseKey
        );
        subscriptionService.updateSubscription(subInfo, subs.getOrgId());
      } else {
        log.info("AppSumo license was recevied but no action was taken because license is not associated to an org yet");
      }
    } else {
      String err = String.format("Received empty license key for some reason %s", bodyStr);
      log.error(err);
      Sentry.captureException(new RuntimeException(err));
    }

    return new WebhookResp(
      true,
      bodyStr,
      Optional.empty()
    );
  }

  @RequestMapping(value = Routes.APP_SUMO_REDIRECT_URL, method = RequestMethod.GET, produces = MediaType.TEXT_HTML_VALUE)
  public String redirectHandler(@RequestParam("code") Optional<String> code) {
    log.info("appsumo redirection with code {}", code);
    String err = "";
    String license = "";
    if (code.isEmpty() || StringUtils.isBlank(code.get()))
      err = "AppSumo did not communicate your deal information to Fable";
    else {
      try {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CONTENT_TYPE, "application/json");

        ParameterizedTypeReference<Map<String, Object>> responseType = new ParameterizedTypeReference<>() {
        };
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(Map.of(
          "client_id", appsumoConfig.getClientId(),
          "client_secret", appsumoConfig.getClientSecret(),
          "code", code.get(),
          "redirect_uri", "https://api.service.sharefable.com/v1/vr/as/redir",
          "grant_type", "authorization_code"
        ), headers);
        ResponseEntity<Map<String, Object>> resp = this.restClient.exchange(
          "https://appsumo.com/openid/token/", HttpMethod.POST, entity, responseType);

        Map<String, Object> tokenExchangeBody;
        int responseCode;
        if ((responseCode = resp.getStatusCode().value()) != 200 || (tokenExchangeBody = resp.getBody()) == null) {
          RuntimeException ex = new RuntimeException("Can't complete token exchange request. Response code" + responseCode);
          log.error("Error during appsumo token exchange", ex);
          throw ex;
        }
        String accessToken = (String) tokenExchangeBody.get("access_token");

        ParameterizedTypeReference<Map<String, Object>> responseType2 = new ParameterizedTypeReference<>() {
        };
        ResponseEntity<Map<String, Object>> resp2 = this.restClient.exchange(
          "https://appsumo.com/openid/license_key/?access_token=" + accessToken, HttpMethod.GET, new HttpEntity<>(null), responseType2);
        Map<String, Object> licenseExchangeBody;
        if ((responseCode = resp2.getStatusCode().value()) != 200 || (licenseExchangeBody = resp2.getBody()) == null) {
          RuntimeException ex = new RuntimeException("Can't complete license exchange request. Response code" + responseCode);
          log.error("Error during appsumo license exchange", ex);
          throw ex;
        }
        license = (String) licenseExchangeBody.get("license_key");
      } catch (Exception e) {
        log.error("Error while getting auth token from AppSumo", e);
        Sentry.captureException(e);
        err = "AppSumo did not communicate your deal information to Fable";
      }
    }

    // This following massacre is because of how majestic AppSumo is with handling connection, speaking of over engineering :'D
    // https://docs.licensing.appsumo.com/licensing/licensing__connect.html#fetching-a-license
    if (StringUtils.isBlank(err) && !StringUtils.isBlank(license)) {
      return String.format("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>✅ Fable <> AppSumo</title>
            <script>
              setTimeout(function() {
                window.location = "%s/aslp?l=%s";
              }, 200);
            </script>
        </head>
        <body>
          Please wait...
        </body>
        </html>
        """, appConfig.getDns(), license);
    } else {
      String errStr = String.format("AppSumo license communication error [%s] license [%s]", err, license);
      log.error(errStr);
      Sentry.captureException(new RuntimeException(errStr));
      return String.format("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>❌ Fable <> AppSumo</title>
        </head>
        <body>
          Something is not right. Gathering more information...
          <script>
            setTimeout(function() {
              window.location = "%s/aslp?err=%s&l=%s&t=%s";
            }, 200);
          </script>
        </body>
        </html>
              """, appConfig.getDns(), err, license, code.orElse(""));
    }
  }

  public record WebhookResp(
    Boolean success,
    String event,
    Optional<String> message
  ) {

  }
}
