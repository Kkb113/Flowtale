package com.sharefable.api.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.PublishedScreen;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PublishedScreenTest {
  private final ObjectMapper json = new ObjectMapper();
  private final String empty = "{\"v\":1,\"edits\":{}}";
  private final String source = """
    {"version":"2023-07-27","vpd":{"w":800,"h":600},"isHTML4":false,"privateCaptureMeta":"PRIVATE",
    "docTree":{"type":1,"name":"html","attrs":{},"props":{},"chldrn":[
      {"type":1,"name":"body","attrs":{},"props":{},"chldrn":[
        {"type":1,"name":"div","attrs":{"f-id":"target","title":"PRIVATE","data-secret":"PRIVATE"},
         "props":{"rect":{"width":220,"height":60},"nodeProps":{"value":"PRIVATE"},"base64Img":"PRIVATE"},
         "chldrn":[{"type":8,"name":"#comment","attrs":{},"props":{"textContent":"textfid/text-id==ftext/PRIVATE"},"chldrn":[]},
          {"type":3,"name":"#text","attrs":{},"props":{"textContent":"PRIVATE"},"chldrn":[]}]}
      ]}
    ]}}
    """;

  @Test void redactionRemovesEntireSensitiveSubtreeAndLaterEditsWithoutChangingDraft() throws Exception {
    var input = json.readTree(source);
    var original = input.deepCopy();
    var local = json.readTree("""
      {"v":1,"edits":{"1.0.0":{"4":[1,0,4,"","blur(4px)","target"],
      "1":[9,"PRIVATE","PRIVATE_NEW","target"]},"1.0.0.1":{"1":[8,"PRIVATE","PRIVATE_CHILD","text-id"]}}}
      """);
    var result = PublishedScreen.compile(input, local, json.readTree(empty));
    assertEquals(original, input);
    assertTrue(result.redacted());
    assertFalse(result.screen().toString().contains("PRIVATE"));
    assertFalse(result.edits().toString().contains("PRIVATE"));
    var replacement = result.screen().path("docTree").path("chldrn").get(0).path("chldrn").get(0);
    assertEquals("target", replacement.path("attrs").path("f-id").asText());
    assertEquals("true", replacement.path("attrs").path("data-fable-redacted").asText());
    assertTrue(replacement.path("attrs").path("style").asText().contains("width:220.0px;height:60.0px"));
    assertTrue(replacement.path("chldrn").isEmpty());
    assertTrue(result.edits().path("edits").isEmpty());
  }

  @Test void hideAndMaskAlsoRemoveOriginals() throws Exception {
    for (String edit : new String[]{"\"3\":[1,\"block\",\"none\",\"target\"]", "\"5\":[1,\"background:red\",\"PRIVATE\",\"target\"]"}) {
      var result = PublishedScreen.compile(json.readTree(source), json.readTree("{\"v\":1,\"edits\":{\"1.0.0\":{" + edit + "}}}"), json.readTree(empty));
      assertTrue(result.redacted());
      assertFalse(result.screen().toString().contains("PRIVATE"));
    }
  }

  @Test void globalEditsAreResolvedPerScreenAndOverrideLocalValues() throws Exception {
    var local = json.readTree("{\"v\":1,\"edits\":{\"1.0.0\":{\"1\":[9,\"PRIVATE\",\"Local value\",\"target\"]}}}");
    var global = json.readTree("""
      {"v":1,"edits":{"fid/target":{"1":{"type":1,"fid":"target","timeInSec":1,"oldValue":"PRIVATE","newValue":"Global value"}}}}
      """);
    var result = PublishedScreen.compile(json.readTree(source), local, global);
    assertFalse(result.redacted());
    assertTrue(result.screen().toString().contains("Global value"));
    assertFalse(result.screen().toString().contains("Local value"));
    assertEquals("Global value", result.edits().path("edits").path("1.0.0").path("1").get(2).asText());
    assertFalse(result.edits().toString().contains("PRIVATE"));
  }

  @Test void missingLocalTargetsFailPublicationInsteadOfExportingTheRawOriginal() throws Exception {
    var local = json.readTree("{\"v\":1,\"edits\":{\"1.9\":{\"4\":[1,0,4,\"\",\"blur(4px)\",\"missing\"]}}}");
    assertThrows(IllegalArgumentException.class, () -> PublishedScreen.compile(json.readTree(source), local, json.readTree(empty)));
  }

  @Test void replacingParentTextCannotBypassRedactionOfADescendant() throws Exception {
    var local = json.readTree("""
      {"v":1,"edits":{"1.0":{"1":[9,"PRIVATE","PRIVATE_NEW",""]},
        "1.0.0":{"4":[1,0,4,"","blur(4px)","target"]}}}
      """);
    var error = assertThrows(IllegalArgumentException.class,
      () -> PublishedScreen.compile(json.readTree(source), local, json.readTree(empty)));
    assertTrue(error.getMessage().contains("overlaps"));
  }

  @Test void maskPreservesOnlyReplacementImageAndExplicitDimensions() throws Exception {
    var local = json.readTree("""
      {"v":1,"edits":{"1.0.0":{"5":[1,"background-image:url(https://example.com/PRIVATE.png);content:'PRIVATE';width:240px;height:80px;background-image:url(), url(https://example.com/replacement.png) !important;","PRIVATE","target"]}}}
      """);
    var result = PublishedScreen.compile(json.readTree(source), local, json.readTree(empty));
    assertFalse(result.screen().toString().contains("PRIVATE"));
    var style = result.screen().path("docTree").path("chldrn").get(0).path("chldrn").get(0).path("attrs").path("style").asText();
    assertTrue(style.contains("https://example.com/replacement.png"));
    assertTrue(style.contains("width:240px!important;height:80px!important;"));
  }

  @Test void textFidTargetsAndUnrelatedScreensRemainSupported() throws Exception {
    var global = json.readTree("""
      {"v":1,"edits":{"fid/text-id":{"1":{"type":1,"fid":"text-id","timeInSec":1,"newValue":"Replacement"}},
      "fid/elsewhere":{"4":{"type":4,"fid":"elsewhere","timeInSec":1,"newBlurValue":4,"newFilterPropertyValue":"blur(4px)"}}}}
      """);
    var result = PublishedScreen.compile(json.readTree(source), json.readTree(empty), global);
    assertFalse(result.redacted());
    assertTrue(result.screen().toString().contains("Replacement"));
    assertFalse(result.screen().toString().contains("ftext/PRIVATE"));
  }

  @Test void measuredInlineImagesBecomeHashesAndNeverPublicEditMetadata() throws Exception {
    var local = json.readTree("""
      {"v":1,"edits":{"1.0.0":{"4":[1,0,4,"","blur(4px)","target",
        {"width":200,"height":50,"assetKeys":[],"inlineImages":["data:image/png;base64,c2VjcmV0"]}]}}}
      """);
    var result = PublishedScreen.compile(json.readTree(source), local, json.readTree(empty));
    assertEquals(org.apache.commons.codec.digest.DigestUtils.sha256Hex("data:image/png;base64,c2VjcmV0"),
      result.screen().path("redactedAssetKeys").get(0).asText());
    assertFalse(result.edits().toString().contains("c2VjcmV0"));
  }

  @Test void redactionRemovesGeneratedCssAndDuplicateFrameSourcesIncludingHistoricalOutput() throws Exception {
    var input = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(source);
    var body = (com.fasterxml.jackson.databind.node.ObjectNode) input.path("docTree").path("chldrn").get(0);
    body.put("name", "iframe");
    ((com.fasterxml.jackson.databind.node.ObjectNode) body.path("attrs")).put("srcdoc", "<div>PRIVATE</div>");
    ((com.fasterxml.jackson.databind.node.ObjectNode) body.path("props")).put("cssRules", ".secret::before{content:'PRIVATE';color:red}");
    ((com.fasterxml.jackson.databind.node.ObjectNode) body.path("props")).putArray("adoptedStylesheets")
      .add(".secret::after{content:var(--shadow)}:root{--shadow:'PRIVATE';--color:red}");
    ((com.fasterxml.jackson.databind.node.ObjectNode) body.path("chldrn").get(0).path("attrs")).put("class", "secret");
    var local = json.readTree("{\"v\":1,\"edits\":{\"1.0.0\":{\"4\":[1,0,4,\"\",\"blur(4px)\",\"target\"]}}}");
    var result = PublishedScreen.compile(input, local, json.readTree(empty));
    assertFalse(result.screen().toString().contains("PRIVATE"));
    assertFalse(result.screen().toString().contains("srcdoc"));
    assertTrue(result.screen().toString().contains("color:red"));
    assertTrue(input.toString().contains("<div>PRIVATE</div>"));
    // Previously compiled snapshots no longer have their original redaction edit.
    var legacy = result.screen().deepCopy();
    legacy.put("publicationSchema", 1);
    var frame = (com.fasterxml.jackson.databind.node.ObjectNode) legacy.path("docTree").path("chldrn").get(0);
    ((com.fasterxml.jackson.databind.node.ObjectNode) frame.path("attrs")).put("srcdoc", "PRIVATE");
    ((com.fasterxml.jackson.databind.node.ObjectNode) frame.path("props")).put("cssRules", "div::after{content:'PRIVATE'}");
    assertFalse(PublishedScreen.compile(legacy, result.edits(), json.readTree(empty)).screen().toString().contains("PRIVATE"));
    assertTrue(PublishedScreen.compile(input, json.readTree(empty), json.readTree(empty)).screen().toString().contains("srcdoc"));
  }
}
