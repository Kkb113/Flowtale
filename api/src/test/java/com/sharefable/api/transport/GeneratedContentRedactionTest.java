package com.sharefable.api.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sharefable.api.common.GeneratedContentRedaction;
import com.sharefable.api.common.PublishedCss;
import com.sharefable.api.common.PublishedScreen;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class GeneratedContentRedactionTest {
  final ObjectMapper json = new ObjectMapper();
  ObjectNode node(String name, ObjectNode... children) {
    var node = json.createObjectNode().put("name", name).put("type", 1);
    node.putObject("attrs"); node.putObject("props");
    var list = node.putArray("chldrn"); for (var child : children) list.add(child);
    return node;
  }
  ObjectNode style(String css) { var style = node("style"); ((ObjectNode) style.get("props")).put("cssRules", css); return style; }
  ObjectNode element(String name, String classes) { var element = node(name); ((ObjectNode) element.get("attrs")).put("class", classes); return element; }
  ObjectNode source(String css, ObjectNode... body) {
    var source = json.createObjectNode(); source.set("docTree", node("html", node("head", style(css)), node("body", body))); return source;
  }
  Set<String> collect(ObjectNode source, String path) { return GeneratedContentRedaction.collect(source, Set.of(path), Map.of()); }

  @Test void ordinaryRedactionPreservesAllUnrelatedGeneratedContent() {
    String css = ".public::before{content:'PUBLIC_ICON'}:root{--label:'PUBLIC_LABEL'} .public::after{content:var(--label)}";
    var sensitive = collect(source(css, element("div", "secret"), element("button", "public")), "1.1.0");
    assertTrue(sensitive.isEmpty());
    assertEquals(css, PublishedCss.redactText(css, sensitive));
  }

  @Test void sharedVariableNamesAndPublicAncestorDefaultsSurvivePrivateOverrides() {
    String css = ":root{--label:'PUBLIC_DEFAULT'} .secret{--label:'PRIVATE'} .public{--label:'PUBLIC_ICON'}"
      + ".secret::before,.public::before{content:var(--label)}";
    var sensitive = collect(source(css, element("div", "secret"), element("button", "public")), "1.1.0");
    assertEquals(Set.of("PRIVATE"), sensitive);
    String output = PublishedCss.redactText(css, sensitive);
    assertFalse(output.contains("PRIVATE")); assertTrue(output.contains("PUBLIC_ICON")); assertTrue(output.contains("PUBLIC_DEFAULT"));
    assertTrue(output.contains("content:var(--label)"));
  }

  @Test void inheritedVariableReferencesResolveAtTheirDefiningAncestor() {
    String css = ":root{--alias:var(--label);--label:'PRIVATE'} .secret{--label:'PUBLIC'} .secret::before{content:var(--alias)}";
    assertEquals(Set.of("PRIVATE"), collect(source(css, element("div", "secret")), "1.1.0"));
  }

  @Test void hoverResponsiveAndModernSelectorsKeepPrivateLiteralsOutOfDeliveredCss() {
    String css = ":where(.secret):not(.public):focus-visible::before{c\\6f ntent:'PRIVATE_FOCUS'}"
      + "@media(max-width:600px){.secret::after{content:'PRIVATE_MOBILE'}} .public::before{content:'PUBLIC'}";
    var sensitive = collect(source(css, element("div", "secret"), element("div", "public")), "1.1.0");
    assertEquals(Set.of("PRIVATE_FOCUS", "PRIVATE_MOBILE"), sensitive);
    String output = PublishedCss.redactText(css, sensitive);
    assertFalse(output.contains("PRIVATE")); assertTrue(output.contains("PUBLIC"));
  }

  @Test void attributeSelectorStringsAreNotRewrittenAsInteractionStates() {
    var target = element("div", "secret"); ((ObjectNode) target.get("attrs")).put("data-state", ":hover");
    assertEquals(Set.of("PRIVATE"), collect(source("[data-state=':hover']::before{content:'PRIVATE'}", target), "1.1.0"));
  }

  @Test void escapedClassNamesAndQuotedVariableExamplesKeepUnrelatedValues() {
    String css = ".before\\:icon::before{content:'var(--example)'} :root{--example:'PUBLIC'}";
    var sensitive = collect(source(css, element("div", "before:icon")), "1.1.0");
    assertEquals(Set.of("var(--example)"), sensitive);
    assertTrue(PublishedCss.redactText(css, sensitive).contains("PUBLIC"));
  }

  @Test void framesWithTheSameClassNamesHaveSeparateGeneratedContentSources() {
    var frame = node("iframe", node("html", node("head", style(".secret::before{content:'PUBLIC_FRAME'}")),
      node("body", element("div", "secret"))));
    assertEquals(Set.of("PRIVATE"), collect(source(".secret::before{content:'PRIVATE'}", element("div", "secret"), frame), "1.1.0"));
  }

  @Test void shadowStylesInheritHostVariablesWithoutMatchingUnrelatedFrameStyles() {
    var host = node("widget", style(".secret::before{content:var(--label)} .public::before{content:'PUBLIC_ICON'}"),
      element("div", "secret"), element("button", "public"));
    ((ObjectNode) host.get("props")).put("isShadowHost", true);
    assertEquals(Set.of("PRIVATE"), collect(source(":root{--label:'PRIVATE'}", host), "1.1.0.1"));
  }

  @Test void privateMatchingContextIsNeverSerializedInPublicationResults() throws Exception {
    var input = source(".secret::before{content:'PRIVATE'} .public::before{content:'PUBLIC_ICON'}", element("div", "secret"));
    var edits = json.readTree("{\"v\":1,\"edits\":{\"1.1.0\":{\"4\":[1,0,4,\"\",\"blur(4px)\",\"\"]}}}");
    var compiled = PublishedScreen.compile(input, edits, json.readTree("{\"v\":1,\"edits\":{}}"));
    String output = json.writeValueAsString(compiled);
    assertFalse(output.contains("PRIVATE")); assertFalse(output.contains("cssSource")); assertFalse(output.contains("cssTargets"));
    assertTrue(output.contains("PUBLIC_ICON")); assertEquals(2, compiled.screen().path("publicationSchema").asInt());
  }
}
