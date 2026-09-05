package com.sharefable.api.common;

import com.fasterxml.jackson.databind.ObjectMapper;

/** Offline maintenance entry point; uses the same compiler as publication, without starting the API. */
public final class PublishedScreenTool {
  private PublishedScreenTool() {}

  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    byte[] bytes = System.in.readNBytes(192 * 1024 * 1024 + 1);
    if (bytes.length > 192 * 1024 * 1024) throw new IllegalArgumentException("Compilation input exceeds the supported limit");
    var input = mapper.readTree(bytes);
    var result = PublishedScreen.compile(input.path("source"), input.path("local"), input.path("global"));
    mapper.writeValue(System.out, result);
  }
}
