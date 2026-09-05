package com.sharefable.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.ApiResp;
import com.sharefable.api.config.OrgContext;
import com.sharefable.api.service.PrivateThumbnailService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice
@RequiredArgsConstructor
public class PrivateThumbnailAdvice implements ResponseBodyAdvice<Object> {
  private final ObjectMapper mapper;
  private final PrivateThumbnailService thumbnails;

  @Override public boolean supports(MethodParameter method, Class<? extends HttpMessageConverter<?>> converter) {
    return ApiResp.class.isAssignableFrom(method.getParameterType());
  }

  @Override public Object beforeBodyWrite(Object body, MethodParameter method, MediaType mediaType,
      Class<? extends HttpMessageConverter<?>> converter, ServerHttpRequest request, ServerHttpResponse response) {
    if (!(body instanceof ApiResp<?>) || !request.getURI().getPath().startsWith("/v1/f/") || OrgContext.getCurrentOrgId() == null) return body;
    var projected = mapper.valueToTree(body);
    thumbnails.project(projected, OrgContext.getCurrentOrgId());
    response.getHeaders().setCacheControl("no-store");
    return projected;
  }
}
