package com.sharefable.api.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.util.*;
import java.util.regex.Pattern;

/** Removes generated content from redacted publications, including its custom-property sources. */
public final class PublishedCss {
  private PublishedCss() {}
  record Declaration(int start, int end, String name, String value, String selector) {}
  private static final Pattern ESCAPE = Pattern.compile("\\\\([0-9a-fA-F]{1,6})(?:\\r\\n|[\\t\\n\\r\\f ])?|\\\\([^\\n\\r\\f])");
  private static final Pattern STRING_OR_COMMENT = Pattern.compile("(?s)\"(?:\\\\.|[^\"\\\\])*+\"|'(?:\\\\.|[^'\\\\])*+'|/\\*.*?(?:\\*/|$)");

  static String decode(String value) {
    var matcher = ESCAPE.matcher(value);
    var out = new StringBuffer();
    while (matcher.find()) {
      String replacement = matcher.group(2);
      if (replacement == null) {
        int cp = Integer.parseInt(matcher.group(1), 16);
        replacement = new String(Character.toChars(cp == 0 || cp > 0x10ffff ? 0xfffd : cp));
      }
      matcher.appendReplacement(out, java.util.regex.Matcher.quoteReplacement(replacement));
    }
    matcher.appendTail(out);
    return out.toString();
  }

  // A small lexical scan, not a selector parser: quoted semicolons, comments and
  // function arguments cannot terminate a declaration. Selectors remain untouched.
  static List<Declaration> declarations(String css) {
    List<Declaration> result = new ArrayList<>();
    var selectors = new ArrayDeque<String>();
    selectors.push("");
    int start = 0, colon = -1, depth = 0;
    char quote = 0;
    for (int i = 0; i <= css.length(); i++) {
      char c = i == css.length() ? ';' : css.charAt(i);
      if (c == '\\') { i++; continue; }
      if (quote != 0) { if (c == quote) quote = 0; continue; }
      if (c == '\'' || c == '"') { quote = c; continue; }
      if (c == '/' && i + 1 < css.length() && css.charAt(i + 1) == '*') {
        int end = css.indexOf("*/", i + 2);
        i = end < 0 ? css.length() : end + 1; continue;
      }
      if (c == '(' || c == '[') depth++;
      if (c == ')' || c == ']') depth = Math.max(0, depth - 1);
      if (depth != 0) continue;
      if (c == ':' && colon < 0) colon = i;
      if (c == '{' || c == '}' || c == ';') {
        if (c != '{' && colon >= start) {
          String name = decode(css.substring(start, colon).replaceAll("(?s)/\\*.*?\\*/", "").trim());
          result.add(new Declaration(start, i, name, css.substring(colon + 1, i), selectors.peek()));
        }
        if (c == '{') {
          String selector = css.substring(start, i).replaceAll("(?s)/\\*.*?\\*/", "").trim();
          if (selector.startsWith("@")) selector = selectors.peek();
          else if (!selectors.peek().isEmpty()) selector = selector.contains("&")
            ? selector.replace("&", selectors.peek()) : selectors.peek() + " " + selector;
          selectors.push(selector);
        } else if (c == '}' && selectors.size() > 1) selectors.pop();
        start = i + 1; colon = -1;
      }
    }
    return result;
  }

  public static Set<String> protectedVariables(Collection<String> styles) {
    return protectedVariables(styles, Set.of());
  }

  public static Set<String> protectedVariables(Collection<String> styles, Set<String> seed) {
    var all = styles.stream().flatMap(css -> declarations(css).stream()).toList();
    Set<String> names = new HashSet<>(seed);
    boolean changed;
    do {
      changed = false;
      for (var declaration : all) {
        if (!declaration.name.equalsIgnoreCase("content") && !names.contains(declaration.name)) continue;
        var vars = Pattern.compile("(?i:var)\\s*\\(\\s*(--[^\\s,)]+)")
          .matcher(decode(declaration.value.replaceAll("(?s)/\\*.*?\\*/", "")));
        while (vars.find()) changed |= names.add(vars.group(1));
      }
    } while (changed);
    return names;
  }

  public static String redact(String css, Set<String> variables) {
    var comments = STRING_OR_COMMENT.matcher(css);
    var clean = new StringBuffer();
    while (comments.find()) comments.appendReplacement(clean, java.util.regex.Matcher.quoteReplacement(
      comments.group().startsWith("/*") ? " " : comments.group()));
    comments.appendTail(clean);
    css = clean.toString();
    var out = new StringBuilder();
    int copied = 0;
    for (var declaration : declarations(css)) {
      if (!declaration.name.equalsIgnoreCase("content") && !variables.contains(declaration.name)) continue;
      out.append(css, copied, declaration.start);
      if (declaration.name.equalsIgnoreCase("content")) out.append("content:\"\"");
      // Keep the delimiter and all unrelated declarations, including layout and image rules.
      copied = declaration.end;
    }
    return out.append(css, copied, css.length()).toString();
  }

  public static List<String> styles(JsonNode tree) {
    List<String> result = new ArrayList<>();
    visit(tree, (css, setter) -> result.add(css));
    return result;
  }

  public static void redactTree(JsonNode tree, Set<String> variables) {
    visit(tree, (css, setter) -> setter.accept(redact(css, variables)));
  }

  /** Selective live-publication cleanup. Sensitive values never become public policy metadata. */
  public static String redactText(String css, Set<String> sensitive) {
    var tokens = STRING_OR_COMMENT.matcher(css);
    var out = new StringBuffer();
    while (tokens.find()) {
      String token = tokens.group();
      String replacement = token.startsWith("/*") ? " "
        : sensitive.contains(decode(token.substring(1, token.length() - 1))) ? "\"\"" : token;
      tokens.appendReplacement(out, java.util.regex.Matcher.quoteReplacement(replacement));
    }
    tokens.appendTail(out);
    return out.toString();
  }

  static Set<String> strings(String value) {
    Set<String> strings = new HashSet<>();
    var tokens = STRING_OR_COMMENT.matcher(value);
    while (tokens.find()) if (!tokens.group().startsWith("/*")) {
      String text = decode(tokens.group().substring(1, tokens.group().length() - 1));
      if (!text.isEmpty()) strings.add(text);
    }
    return strings;
  }

  static Set<String> references(String value) {
    // A quoted label such as "var(--example)" is text, not a variable dependency.
    String unquoted = STRING_OR_COMMENT.matcher(value).replaceAll(" ");
    var matcher = Pattern.compile("(?i:var)\\s*\\(\\s*(--[^\\s,)]+)").matcher(decode(unquoted));
    Set<String> names = new LinkedHashSet<>();
    while (matcher.find()) names.add(matcher.group(1));
    return names;
  }

  public static void redactTreeText(JsonNode tree, Set<String> sensitive) {
    visit(tree, (css, setter) -> setter.accept(redactText(css, sensitive)));
  }

  private static void visit(JsonNode node, java.util.function.BiConsumer<String, java.util.function.Consumer<String>> consumer) {
    if (node instanceof ObjectNode object) {
      for (String key : List.of("style", "cssRules")) if (object.path(key).isTextual()) {
        consumer.accept(object.path(key).asText(), value -> object.put(key, value));
      }
      if (object.path("adoptedStylesheets") instanceof ArrayNode styles) {
        for (int i = 0; i < styles.size(); i++) if (styles.get(i).isTextual()) {
          int index = i;
          consumer.accept(styles.get(i).asText(), value -> styles.set(index, TextNode.valueOf(value)));
        }
      }
      // Captures can also retain a style element's original text children.
      if (object.path("name").asText().equalsIgnoreCase("style")) visitStyleText(object, consumer);
    }
    for (JsonNode child : node) visit(child, consumer);
  }

  private static void visitStyleText(JsonNode node, java.util.function.BiConsumer<String, java.util.function.Consumer<String>> consumer) {
    if (node instanceof ObjectNode object && object.path("textContent").isTextual()) {
      consumer.accept(object.path("textContent").asText(), value -> object.put("textContent", value));
    }
    for (JsonNode child : node) visitStyleText(child, consumer);
  }
}
