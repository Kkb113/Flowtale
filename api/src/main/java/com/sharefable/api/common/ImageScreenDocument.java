package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/** Image screens have one server-owned source in the standard image document. */
public final class ImageScreenDocument {
  private ImageScreenDocument() {}

  public static JsonNode withSource(JsonNode source, String imageUrl) {
    JsonNode result = source.deepCopy();
    JsonNode image = result.path("docTree").path("chldrn").path(2).path("chldrn").path(1);
    if (!image.path("name").asText().equals("img") || !(image.path("attrs") instanceof ObjectNode attrs)) {
      throw new IllegalArgumentException("The image screen is invalid. Replace the screen before publishing.");
    }
    attrs.put("src", imageUrl);
    attrs.remove("srcset");
    return result;
  }
}
