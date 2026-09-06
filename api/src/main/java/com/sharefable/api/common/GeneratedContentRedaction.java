package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import java.util.*;
import java.util.regex.Pattern;

/** Resolves generated-content sources against private capture scopes, before targets are removed. */
public final class GeneratedContentRedaction {
  private GeneratedContentRedaction() {}
  private static final Pattern RESOURCE = Pattern.compile("/(?:proxy_asset|proxy)/([0-9a-fA-F-]{36})");
  private static final String STATES = "hover|active|focus-visible|focus-within|focus|visited|link|target|checked|disabled|enabled|indeterminate|valid|invalid|placeholder-shown|autofill";
  private record Reference(String name, Element origin, Scope scope) {}
  private record Definition(String value, Element origin, Scope scope) {}

  public static Set<String> collect(JsonNode source, Set<String> paths, Map<String, String> resources) {
    Set<String> result = new HashSet<>();
    if (!paths.isEmpty()) new Scope(source.path("docTree"), "1", paths, resources, result, null, null);
    return result;
  }

  private static final class Scope {
    final Set<String> paths;
    final Map<String, String> resources;
    final Set<String> sensitive;
    final Set<String> styles = new LinkedHashSet<>();
    final List<Element> targets = new ArrayList<>();
    final List<Runnable> nested = new ArrayList<>();
    final Scope inherited;
    final Element host;
    List<PublishedCss.Declaration> rules;

    Scope(JsonNode root, String path, Set<String> paths, Map<String, String> resources, Set<String> sensitive, Scope inherited, Element host) {
      this.paths = paths; this.resources = resources; this.sensitive = sensitive;
      this.inherited = inherited; this.host = host;
      append(root, path, new Document(""), true);
      var pending = new ArrayDeque<>(styles);
      while (!pending.isEmpty()) {
        var matcher = RESOURCE.matcher(pending.remove());
        while (matcher.find()) {
          String css = resources.get(matcher.group(1));
          if (css != null && styles.add(css)) pending.add(css);
        }
      }
      rules = styles.stream().flatMap(css -> PublishedCss.declarations(css).stream()).toList();
      for (Element target : targets) {
        var variables = new ArrayDeque<Reference>();
        for (var rule : rules) if (rule.name().equalsIgnoreCase("content") && matches(target, rule.selector())) {
          inspect(rule.value(), target, variables);
        }
        for (var rule : PublishedCss.declarations(target.attr("style"))) {
          if (rule.name().equalsIgnoreCase("content")) inspect(rule.value(), target, variables);
        }
        Set<Reference> visited = new HashSet<>();
        while (!variables.isEmpty()) {
          var reference = variables.remove();
          if (!visited.add(reference)) continue;
          // Custom properties inherit from the nearest defining ancestor. A private
          // override must not cause a different public ancestor value to be removed.
          for (var definition : reference.scope.resolve(reference.name, reference.origin)) {
            definition.scope.inspect(definition.value, definition.origin, variables);
          }
        }
      }
      nested.forEach(Runnable::run);
    }

    List<Definition> resolve(String name, Element origin) {
      for (Element element = origin; element != null; element = element.parent()) {
        List<Definition> values = new ArrayList<>();
        for (var rule : rules) if (rule.name().equals(name) && matches(element, rule.selector())) values.add(new Definition(rule.value(), element, this));
        for (var rule : PublishedCss.declarations(element.attr("style"))) if (rule.name().equals(name)) values.add(new Definition(rule.value(), element, this));
        if (!values.isEmpty()) return values;
      }
      return inherited == null ? List.of() : inherited.resolve(name, host);
    }

    void inspect(String value, Element origin, ArrayDeque<Reference> variables) {
      sensitive.addAll(PublishedCss.strings(value));
      for (String name : PublishedCss.references(value)) variables.add(new Reference(name, origin, this));
    }

    void append(JsonNode node, String path, Element parent, boolean root) {
      String name = node.path("name").asText();
      if (!root && (name.equalsIgnoreCase("html") || node.path("props").path("isShadowHost").asBoolean())) {
        // Frame/shadow styles cannot match elements in a neighbouring capture scope.
        if (name.equalsIgnoreCase("html")) {
          nested.add(() -> new Scope(node, path, paths, resources, sensitive, null, null));
          return;
        }
        Element host = parent.appendElement(name);
        node.path("attrs").fields().forEachRemaining(attr -> { if (attr.getValue().isTextual()) host.attr(attr.getKey(), attr.getValue().asText()); });
        if (paths.stream().anyMatch(target -> path.equals(target) || path.startsWith(target + "."))) targets.add(host);
        boolean shadow = node.path("props").path("isShadowHost").asBoolean();
        nested.add(() -> new Scope(node, path, paths, resources, sensitive, shadow ? this : null, shadow ? host : null));
        return;
      }
      Element element = parent;
      if (node.path("type").asInt() == 1) {
        element = parent.appendElement(name);
        var attrs = node.path("attrs").fields();
        while (attrs.hasNext()) { var attr = attrs.next(); if (attr.getValue().isTextual()) element.attr(attr.getKey(), attr.getValue().asText()); }
        if (paths.stream().anyMatch(target -> path.equals(target) || path.startsWith(target + "."))) targets.add(element);
      } else if (node.path("type").asInt() == 3) {
        element.appendChild(new TextNode(node.path("props").path("textContent").asText()));
      }
      for (String key : List.of("props", "attrs")) {
        if (node.path(key).path("cssRules").isTextual()) styles.add(node.path(key).path("cssRules").asText());
      }
      for (JsonNode css : node.path("props").path("adoptedStylesheets")) if (css.isTextual()) styles.add(css.asText());
      if (name.equalsIgnoreCase("style")) collectStyleText(node);
      if (name.equalsIgnoreCase("link") && (node.path("props").path("isStylesheet").asBoolean()
          || node.path("attrs").path("rel").asText().contains("stylesheet"))) {
        var matcher = RESOURCE.matcher(node.path("attrs").path("href").asText());
        while (matcher.find()) if (resources.containsKey(matcher.group(1))) styles.add(resources.get(matcher.group(1)));
      }
      for (int i = 0; i < node.path("chldrn").size(); i++) append(node.path("chldrn").get(i), path + "." + i, element, false);
    }

    void collectStyleText(JsonNode node) {
      if (node.path("props").path("textContent").isTextual()) styles.add(node.path("props").path("textContent").asText());
      for (JsonNode child : node.path("chldrn")) collectStyleText(child);
    }
  }

  private static boolean matches(Element target, String selector) {
    if (selector.isBlank()) return false;
    // Pseudo-elements originate on the selected element. Include interaction states
    // as possible matches, so hovering cannot expose another protected CSS literal.
    var literals = new ArrayList<String>();
    var quoted = Pattern.compile("(?<!\\\\)(?:\"(?:\\\\.|[^\"\\\\])*+\"|'(?:\\\\.|[^'\\\\])*+')").matcher(selector);
    var masked = new StringBuffer();
    while (quoted.find()) {
      literals.add(quoted.group()); quoted.appendReplacement(masked, "\"fable-selector-literal-" + (literals.size() - 1) + "\"");
    }
    quoted.appendTail(masked);
    String normalized = masked.toString().replaceAll("(?i)(?<!\\\\)::(?:before|after|marker|first-letter|first-line|placeholder|selection|backdrop|file-selector-button)\\b", "")
      .replaceAll("(?i)(?<!\\\\):(?:before|after|first-letter|first-line)\\b", "")
      .replaceAll(":not\\(\\s*:(?:" + STATES + ")\\s*\\)", "")
      .replaceAll("(?i)(?<!\\\\):(?:" + STATES + ")\\b", "")
      .replaceAll(":host\\(([^()]*)\\)", ":root$1").replaceAll(":host\\b", ":root")
      .replace(":where(", ":is(");
    for (int i = 0; i < literals.size(); i++) normalized = normalized.replace("\"fable-selector-literal-" + i + "\"", literals.get(i));
    if (normalized.isBlank()) normalized = "*";
    try { return target.is(normalized); }
    catch (IllegalArgumentException unsupported) {
      throw new IllegalArgumentException("A generated-content CSS selector cannot be safely resolved for this redaction. Simplify the captured selector before publishing.", unsupported);
    }
  }
}
