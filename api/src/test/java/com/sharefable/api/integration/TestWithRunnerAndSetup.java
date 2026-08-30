package com.sharefable.api.integration;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.Main;
import com.sharefable.api.common.ApiResp;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.io.IOException;
import java.util.Map;

@SpringBootTest(classes = Main.class)
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class TestWithRunnerAndSetup {
  protected MockMvc mvc;
  @Autowired
  WebApplicationContext webApplicationContext;

  @BeforeAll
  public void setUp() {
    mvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
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
