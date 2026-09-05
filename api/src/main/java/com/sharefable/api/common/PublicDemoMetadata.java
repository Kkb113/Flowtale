package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;

/** Explicit public projection of the existing playback metadata format. */
public final class PublicDemoMetadata {
  private PublicDemoMetadata() {}

  private static final List<String> DEMO_FIELDS = List.of(
    "id", "rid", "assetPrefixHash", "displayName", "description", "createdAt", "updatedAt",
    "lastPublishedDate", "pubDataFileName", "pubLoaderFileName", "pubEditFileName", "pubTourEntityFileName",
    "site", "responsive", "logClass", "responsive2", "deleted", "entityType", "info", "owner",
    "globalOpts", "settings", "datasets", "screens", "idxm", "cc");
  private static final List<String> SCREEN_FIELDS = List.of(
    "id", "parentScreenId", "rid", "assetPrefixHash", "displayName", "thumbnail", "url", "icon",
    "responsive", "type", "createdAt", "updatedAt", "redacted");
  private static final List<String> INFO_FIELDS = List.of("thumbnail", "frameSettings", "isVideo", "locked");

  public static ObjectNode project(ObjectNode response) {
    ObjectNode result = response.deepCopy();
    result.retain(List.of("status", "data"));
    if (!(result.get("data") instanceof ObjectNode data)) {
      throw new IllegalArgumentException("Publication metadata must contain a demo object");
    }
    data.retain(DEMO_FIELDS);
    if (data.get("info") instanceof ObjectNode info) info.retain(INFO_FIELDS);
    else data.remove("info");
    if (data.has("screens")) {
      JsonNode screens = data.get("screens");
      if (!screens.isArray()) throw new IllegalArgumentException("Publication screens must be an array");
      for (JsonNode screen : screens) {
        if (!(screen instanceof ObjectNode object)) throw new IllegalArgumentException("Invalid publication screen");
        object.retain(SCREEN_FIELDS);
      }
    }
    return result;
  }
}
