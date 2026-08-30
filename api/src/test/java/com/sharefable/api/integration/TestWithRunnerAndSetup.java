package com.sharefable.api.integration;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.amazonaws.services.sqs.AmazonSQS;
import com.sharefable.Main;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.service.NfHookService;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.context.WebApplicationContext;

import java.io.IOException;
import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest(classes = Main.class)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class TestWithRunnerAndSetup {
  protected MockMvc mvc;

  @MockBean(name = "sqsClient")
  AmazonSQS sqsClient;

  @MockBean(name = "jwtDecoder")
  JwtDecoder jwtDecoder;

  @MockBean
  NfHookService nfHookService;

  @MockBean
  AppSettings appSettings;

  @Autowired
  WebApplicationContext webApplicationContext;

  @BeforeAll
  public void setUp() {
    mvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
      .apply(springSecurity())
      .build();
  }

  protected String mapToJson(Object obj) throws JsonProcessingException {
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);
    return objectMapper.writeValueAsString(obj);
  }

  protected <T> T mapFromJson(String json, Class<T> clazz, Class<?> dataCls) throws IOException {
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY);
    JavaType javaType = objectMapper.getTypeFactory().constructParametricType(clazz, dataCls);
    return objectMapper.readValue(json, javaType);
  }

  protected <T> T mapFromMap(Map<String, Object> map, Class<T> clazz) {
    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    return objectMapper.convertValue(map, clazz);
  }

  protected <T> ApiResp<T> sendRequest(String uri, HttpMethod method, Class<T> cls) throws Exception {
    return sendRequest(uri, method, "", cls);
  }

  protected <T> ApiResp<T> sendRequest(String uri, HttpMethod method, String body, Class<T> cls) throws Exception {
    MockHttpServletRequestBuilder requestBuilder;
    if (method == HttpMethod.POST) {
      requestBuilder = MockMvcRequestBuilders.post(uri)
        .accept(MediaType.APPLICATION_JSON)
        .contentType(MediaType.APPLICATION_JSON)
        .content(body);
    } else {
      requestBuilder = MockMvcRequestBuilders.get(uri)
        .accept(MediaType.APPLICATION_JSON);
    }

    requestBuilder.with(jwt().jwt(token -> token
      .subject("test-user")
      .claim("https://identity.sharefable.com/user", Map.of(
        "email", "test@example.com",
        "picture", "",
        "givenName", "Test",
        "familyName", "User"
      ))));

    MvcResult mvcResult = mvc.perform(requestBuilder).andReturn();
    String content = mvcResult.getResponse().getContentAsString();
    ApiResp<T> serviceResponse = mapFromJson(content, ApiResp.class, cls);

    int status = mvcResult.getResponse().getStatus();
    if (status >= 500) {
      throw new RuntimeException("Internal Server Error");
    } else if (status >= 400) {
      throw new RuntimeException("Client error");
    }

    return serviceResponse;
  }
}
