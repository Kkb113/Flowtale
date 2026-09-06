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
    if (input.path("styles").isArray()) {
      var styles = new java.util.ArrayList<String>();
      input.path("styles").forEach(style -> styles.add(style.asText()));
      var seed = new java.util.HashSet<String>();
      input.path("variables").forEach(name -> seed.add(name.asText()));
      var variables = PublishedCss.protectedVariables(styles, seed);
      var output = mapper.createObjectNode();
      var sanitized = output.putArray("styles");
      styles.forEach(style -> sanitized.add(PublishedCss.redact(style, variables)));
      mapper.writeValue(System.out, output);
      return;
    }
    var result = PublishedScreen.compile(input.path("source"), input.path("local"), input.path("global"));
    mapper.writeValue(System.out, result);
  }
}
