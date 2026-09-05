package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import java.util.regex.Pattern;

/** Resolves edits against the private tree and emits only the effective public screen. */
public final class PublishedScreen {
  private static final Pattern PROXY_KEY = Pattern.compile("/proxy_asset/([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})");
  private static final Pattern INLINE_IMAGE = Pattern.compile("data:image/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+");
  private PublishedScreen() {}
  private static final JsonNodeFactory JSON = JsonNodeFactory.instance;
  public record Result(ObjectNode screen, ObjectNode edits, boolean redacted) {}
  private record Target(ObjectNode node, String path) {}
  private record Edit(Target target, int type, ArrayNode tuple, long time) {}

  public static Result compile(JsonNode source, JsonNode local, JsonNode global) {
    if (!(source instanceof ObjectNode input) || !input.path("docTree").isObject()) {
      throw new IllegalArgumentException("Screen content is invalid; repair the screen before publishing");
    }
    ObjectNode screen = input.deepCopy();
    screen.retain("version", "vpd", "isHTML4", "docTree");
    ObjectNode root = (ObjectNode) screen.get("docTree");
    Map<String, Target> paths = new LinkedHashMap<>();
    Map<String, Target> fids = new HashMap<>();
    index(root, "1", paths, fids);
    PublishedEdits.project(local, false);
    PublishedEdits.project(global, true);
    Map<String, Edit> effective = new LinkedHashMap<>();
    local.path("edits").fields().forEachRemaining(entry -> entry.getValue().fields().forEachRemaining(field -> {
      int type = Integer.parseInt(field.getKey());
      ArrayNode tuple = (ArrayNode) field.getValue();
      Target target = entry.getKey().startsWith("fid/") ? fids.get(entry.getKey().substring(4)) : paths.get(entry.getKey());
      if (target == null) throw new IllegalArgumentException("An edited element is missing; repair its edit before publishing");
      String key = target.path + ":" + type;
      Edit edit = new Edit(target, type, tuple.deepCopy(), tuple.path(0).asLong());
      if (!effective.containsKey(key) || effective.get(key).time < edit.time) effective.put(key, edit);
    }));
    global.path("edits").fields().forEachRemaining(entry -> entry.getValue().fields().forEachRemaining(field -> {
      JsonNode value = field.getValue();
      Target target = fids.get(value.path("fid").asText());
      // A global edit normally matches only the screens containing this captured FID.
      if (target == null) return;
      int type = Integer.parseInt(field.getKey());
      ArrayNode tuple = JSON.arrayNode().add(value.path("timeInSec")).addNull();
      if (type == 5) {
        tuple.set(1, value.path("newStyle"));
        tuple.addNull().add(value.path("fid"));
        if (value.hasNonNull("redactionRect")) tuple.add(value.get("redactionRect"));
      } else if (type == 4) {
        tuple.add(value.path("newBlurValue")).addNull().add(value.path("newFilterPropertyValue")).add(value.path("fid"));
        if (value.hasNonNull("redactionRect")) tuple.add(value.get("redactionRect"));
      } else {
        tuple.add(value.path("newValue"));
        if (type == 2) tuple.add(value.path("height")).add(value.path("width"));
        tuple.add(value.path("fid"));
        if (type == 3 && value.hasNonNull("redactionRect")) tuple.add(value.get("redactionRect"));
      }
      effective.put(target.path + ":" + type, new Edit(target, type, tuple, value.path("timeInSec").asLong()));
    }));
    List<Edit> ordered = effective.values().stream().sorted(Comparator.comparingLong(Edit::time)).toList();
    Set<String> protectedPaths = new HashSet<>();
    for (Edit edit : ordered) if (redacts(edit)) protectedPaths.add(edit.target.path);
    Set<String> blockedAssets = new TreeSet<>();
    for (JsonNode key : input.path("redactedAssetKeys")) {
      if (key.isTextual() && key.asText().matches("(?:[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}|[0-9a-f]{64})")) blockedAssets.add(key.asText());
    }
    boolean linkedStyles = paths.values().stream().anyMatch(target -> {
      var node = target.node;
      return node.path("props").path("isStylesheet").asBoolean()
        || (node.path("name").asText().equals("link") && node.path("attrs").path("rel").asText().contains("stylesheet"))
        || (node.path("name").asText().equals("style") && node.toString().contains("/proxy_asset/"));
    });
    for (Edit edit : ordered) if (redacts(edit)) {
      JsonNode measured = edit.tuple.path(edit.type == 4 ? 6 : 4);
      if (linkedStyles && !measured.path("assetKeys").isArray()) {
        throw new IllegalArgumentException("Review this legacy redaction in the editor and reapply it before publishing; its styled image assets have not been measured.");
      }
      for (JsonNode key : measured.path("assetKeys")) blockedAssets.add(key.asText());
      for (JsonNode image : measured.path("inlineImages")) blockedAssets.add(org.apache.commons.codec.digest.DigestUtils.sha256Hex(image.asText()));
      var referenced = PROXY_KEY.matcher(edit.target.node.toString());
      while (referenced.find()) blockedAssets.add(referenced.group(1));
      var inline = INLINE_IMAGE.matcher(edit.target.node.toString());
      while (inline.find()) blockedAssets.add(org.apache.commons.codec.digest.DigestUtils.sha256Hex(inline.group()));
    }
    // Replacing parent text destroys descendant identities. Do not reinterpret an old
    // child path against the replacement or let it remove a descendant's redaction.
    for (Edit parent : ordered) {
      if (parent.type != 1 || parent.target.node.path("type").asInt() == 3) continue;
      boolean parentProtected = protectedPaths.stream().anyMatch(path -> parent.target.path.equals(path)
        || parent.target.path.startsWith(path + "."));
      if (parentProtected) continue;
      if (ordered.stream().anyMatch(child -> child.target.path.startsWith(parent.target.path + "."))) {
        throw new IllegalArgumentException("A text replacement overlaps another edited element; review these edits before publishing");
      }
    }
    ObjectNode playback = JSON.objectNode();
    playback.set("v", local.path("v"));
    ObjectNode playbackEdits = playback.putObject("edits");
    for (Edit edit : ordered) {
      boolean protectedTarget = protectedPaths.stream().anyMatch(path -> edit.target.path.equals(path) || edit.target.path.startsWith(path + "."));
      if (protectedTarget) continue;
      apply(edit);
      ObjectNode targetEdits = object(playbackEdits, edit.target.path);
      targetEdits.set(String.valueOf(edit.type), edit.tuple.deepCopy());
    }
    // Redaction wins over every content edit inside it, irrespective of edit timestamps.
    for (Edit edit : ordered) if (redacts(edit)) redact(edit);
    scrubComments(root);
    boolean redacted = input.path("redacted").asBoolean() || !protectedPaths.isEmpty();
    screen.put("redacted", redacted);
    screen.put("publicationSchema", 1);
    if (!blockedAssets.isEmpty()) {
      ArrayNode blocked = screen.putArray("redactedAssetKeys");
      blockedAssets.forEach(blocked::add);
    }
    return new Result(screen, PublishedEdits.project(playback, false), redacted);
  }

  private static void index(ObjectNode root, String path, Map<String, Target> paths, Map<String, Target> fids) {
    ArrayDeque<Target> queue = new ArrayDeque<>();
    queue.add(new Target(root, path));
    while (!queue.isEmpty()) {
      Target target = queue.remove();
      paths.put(target.path, target);
      String fid = target.node.path("attrs").path("f-id").asText("");
      if (!fid.isEmpty()) fids.putIfAbsent(fid, target);
      JsonNode children = target.node.path("chldrn");
      if (!children.isArray()) throw new IllegalArgumentException("Invalid screen children");
      for (int i = 0; i < children.size(); i++) {
        if (!(children.get(i) instanceof ObjectNode child)) throw new IllegalArgumentException("Invalid screen node");
        Target childTarget = new Target(child, target.path + "." + i);
        if (child.path("type").asInt() == 3 && i > 0) {
          String comment = children.get(i - 1).path("props").path("textContent").asText("");
          if (comment.startsWith("textfid/") && comment.contains("==ftext/")) {
            fids.putIfAbsent(comment.substring(8, comment.indexOf("==ftext/")), childTarget);
          }
        }
        queue.add(childTarget);
      }
    }
  }

  private static boolean redacts(Edit edit) {
    return edit.type == 4 && edit.tuple.path(2).asDouble() > 0
      || edit.type == 3 && "none".equalsIgnoreCase(edit.tuple.path(2).asText().trim())
      || edit.type == 5 && !edit.tuple.path(1).isNull() && !edit.tuple.path(1).isMissingNode();
  }

  private static ObjectNode object(ObjectNode parent, String key) {
    if (parent.get(key) instanceof ObjectNode value) return value;
    return parent.putObject(key);
  }

  private static void apply(Edit edit) {
    ObjectNode node = edit.target.node;
    ObjectNode attrs = object(node, "attrs");
    ObjectNode props = object(node, "props");
    String value = edit.tuple.path(2).isNull() ? "" : edit.tuple.path(2).asText();
    switch (edit.type) {
      case 1 -> {
        if (node.path("type").asInt() == 3) props.put("textContent", value);
        else {
          props.remove("textContent");
          ObjectNode text = JSON.objectNode().put("type", 3).put("name", "#text").put("sv", 2);
          text.putObject("attrs"); text.putArray("chldrn"); text.putObject("props").put("textContent", value);
          node.putArray("chldrn").add(text);
        }
      }
      case 2 -> {
        attrs.put("src", value).put("srcset", value);
        props.remove(List.of("base64Img", "absoluteUrl", "origHref", "proxyUrlMap"));
        attrs.put("style", attrs.path("style").asText("") + ";height:" + edit.tuple.path(3).asText()
          + "!important;width:" + edit.tuple.path(4).asText() + "!important;object-fit:cover!important;");
      }
      case 3 -> attrs.put("style", attrs.path("style").asText("") + ";display:" + value + ";");
      case 4 -> attrs.put("style", attrs.path("style").asText("") + ";filter:" + edit.tuple.path(4).asText() + ";");
      case 6 -> attrs.put("placeholder", value);
      case 7 -> { attrs.put("value", value); object(props, "nodeProps").put("value", value); }
      default -> { }
    }
  }

  private static void redact(Edit edit) {
    ObjectNode node = edit.target.node;
    String fid = node.path("attrs").path("f-id").asText("");
    JsonNode measured = edit.tuple.path(edit.type == 4 ? 6 : 4);
    JsonNode rect = measured.isObject() ? measured : node.path("props").path("rect");
    String display = edit.type == 3 ? "none" : "inline-block";
    String style = "display:" + display + "!important;background:#334155!important;color:transparent!important;"
      + "border:0!important;box-sizing:border-box!important;min-width:1em;min-height:1em;overflow:hidden!important;";
    if (rect.path("width").isNumber() && rect.path("height").isNumber()) {
      double width = rect.path("width").asDouble(), height = rect.path("height").asDouble();
      if (Double.isFinite(width) && Double.isFinite(height) && width >= 0 && height >= 0) {
        style += "width:" + width + "px;height:" + height + "px;";
      }
    }
    if (edit.type == 5) style += maskAppearance(edit.tuple.path(1).asText());
    // Preserve document structure when a legacy selection covers the entire body.
    String name = Set.of("html", "head", "body").contains(node.path("name").asText()) ? node.path("name").asText() : "span";
    node.removeAll();
    node.put("type", 1).put("name", name).put("sv", 2);
    ObjectNode attrs = node.putObject("attrs").put("style", style).put("aria-label", "Redacted content")
      .put("data-fable-redacted", "true");
    if (!fid.isEmpty()) attrs.put("f-id", fid);
    node.putObject("props").putObject("proxyUrlMap");
    node.putArray("chldrn");
  }

  private static String maskAppearance(String source) {
    var declarations = Pattern.compile("background-image\\s*:\\s*((?:url\\([^)]*\\)|[^;])*)", Pattern.CASE_INSENSITIVE).matcher(source);
    String background = "";
    while (declarations.find()) background = declarations.group(1);
    var images = Pattern.compile("url\\(\\s*['\"]?(https?://[^'\"\\s()]+|data:image/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)['\"]?\\s*\\)", Pattern.CASE_INSENSITIVE).matcher(background);
    String image = "";
    while (images.find()) image = images.group(1);
    String style = image.isEmpty() ? "" : "background-image:url(\"" + image + "\")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:cover!important;";
    for (String dimension : List.of("width", "height")) {
      var values = Pattern.compile("(?:^|;)\\s*" + dimension + "\\s*:\\s*(\\d+(?:\\.\\d+)?)px(?:\\s*!important)?\\s*(?=;|$)", Pattern.CASE_INSENSITIVE).matcher(source);
      String value = "";
      while (values.find()) value = values.group(1);
      if (!value.isEmpty()) style += dimension + ":" + value + "px!important;";
    }
    return style;
  }

  private static void scrubComments(ObjectNode root) {
    ArrayDeque<ObjectNode> queue = new ArrayDeque<>(); queue.add(root);
    while (!queue.isEmpty()) {
      ObjectNode node = queue.remove();
      if (node.path("type").asInt() == 8) {
        String text = node.path("props").path("textContent").asText("");
        int end = text.indexOf("==ftext/");
        // Keep text-node identity for targeting, but discard its duplicated source content.
        object(node, "props").put("textContent", text.startsWith("textfid/") && end >= 0 ? text.substring(0, end) + "==ftext/" : "");
      }
      for (JsonNode child : node.path("chldrn")) queue.add((ObjectNode) child);
    }
  }
}
