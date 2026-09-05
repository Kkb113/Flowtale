package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Iterator;
import java.util.Map;

/** Public playback needs current edit values, never the author's undo values. */
public final class PublishedEdits {
  private PublishedEdits() {}

  public static ObjectNode project(JsonNode source, boolean global) {
    if (!(source instanceof ObjectNode document) || !document.path("edits").isObject()) {
      throw new IllegalArgumentException("Invalid edit document");
    }
    ObjectNode result = document.deepCopy();
    result.retain("v", "lastUpdatedAtUtc", "edits");
    for (JsonNode edits : result.path("edits")) {
      if (!edits.isObject()) throw new IllegalArgumentException("Invalid element edits");
      Iterator<Map.Entry<String, JsonNode>> fields = edits.fields();
      while (fields.hasNext()) {
        var entry = fields.next();
        int type;
        try { type = Integer.parseInt(entry.getKey()); }
        catch (NumberFormatException error) { throw new IllegalArgumentException("Invalid edit type", error); }
        if (type < 1 || type > 7) throw new IllegalArgumentException("Unsupported edit type");
        if (global) {
          if (!(entry.getValue() instanceof ObjectNode edit)) throw new IllegalArgumentException("Invalid global edit");
          edit.retain("type", "timeInSec", "fid", "srnId", "newValue", "height", "width",
            "newBlurValue", "newFilterPropertyValue", "newStyle", "redactionRect");
          if (edit.hasNonNull("redactionRect")) edit.set("redactionRect", rect(edit.get("redactionRect")));
        } else {
          if (!(entry.getValue() instanceof ArrayNode edit)) throw new IllegalArgumentException("Invalid screen edit");
          int length = type == 2 || type == 4 ? 6 : 4;
          if (edit.size() < length - 1 || edit.size() > (type == 4 ? 7 : type == 3 || type == 5 ? 5 : length)) throw new IllegalArgumentException("Invalid edit tuple");
          if (type == 4 && edit.size() == 7 && !edit.get(6).isNull()) edit.set(6, rect(edit.get(6)));
          if ((type == 3 || type == 5) && edit.size() == 5 && !edit.get(4).isNull()) edit.set(4, rect(edit.get(4)));
          edit.set(type == 5 ? 2 : 1, NullNode.instance);
          if (type == 4) edit.set(3, NullNode.instance);
        }
      }
    }
    return result;
  }

  private static ObjectNode rect(JsonNode value) {
    if (!(value instanceof ObjectNode rect) || !rect.path("width").isNumber() || !rect.path("height").isNumber()
        || !Double.isFinite(rect.path("width").asDouble()) || !Double.isFinite(rect.path("height").asDouble())
        || rect.path("width").asDouble() < 0 || rect.path("height").asDouble() < 0) {
      throw new IllegalArgumentException("Invalid redaction dimensions");
    }
    ObjectNode output = rect.deepCopy();
    output.retain("width", "height", "assetKeys", "inlineImages");
    if (output.has("inlineImages")) {
      if (!output.path("inlineImages").isArray() || output.path("inlineImages").size() > 512) throw new IllegalArgumentException("Invalid inline image redaction list");
      for (JsonNode image : output.path("inlineImages")) {
        if (!image.isTextual() || image.asText().length() > 8 * 1024 * 1024
            || !image.asText().matches("data:image/(png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+")) {
          throw new IllegalArgumentException("Invalid inline image redaction");
        }
      }
    }
    if (output.has("assetKeys")) {
      if (!output.path("assetKeys").isArray() || output.path("assetKeys").size() > 512) throw new IllegalArgumentException("Invalid redaction asset list");
      for (JsonNode key : output.path("assetKeys")) {
        if (!key.isTextual() || !key.asText().matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) {
          throw new IllegalArgumentException("Invalid redaction asset key");
        }
      }
    }
    output.remove(java.util.List.of("assetKeys", "inlineImages"));
    return output;
  }
}
