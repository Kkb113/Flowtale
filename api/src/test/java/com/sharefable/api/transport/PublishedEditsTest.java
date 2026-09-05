package com.sharefable.api.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.PublishedEdits;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PublishedEditsTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test void removesUndoValuesForEveryLocalEditWithoutChangingCurrentValuesOrDraft() throws Exception {
    var source = mapper.readTree("""
      {"v":1,"lastUpdatedAtUtc":7,"history":"SECRET","edits":{"1.0":{
        "1":[1,"SECRET","new text","fid"],"2":[1,"SECRET","new image","10px","20px","fid"],
        "3":[1,"SECRET","none","fid"],"4":[1,99,4,"SECRET","blur(4px)","fid"],
        "5":[1,"new style","SECRET","fid"],"6":[1,"SECRET","new placeholder","fid"],
        "7":[1,"SECRET","new input","fid"]}}}
      """);
    var original = source.deepCopy();
    var output = PublishedEdits.project(source, false);
    assertEquals(original, source);
    assertFalse(output.toString().contains("SECRET"));
    for (int type = 1; type <= 7; type++) {
      var before = source.path("edits").path("1.0").path(String.valueOf(type));
      var after = output.path("edits").path("1.0").path(String.valueOf(type));
      assertEquals(before.size(), after.size());
      assertEquals(before.get(type == 5 ? 1 : 2), after.get(type == 5 ? 1 : 2));
      assertEquals("fid", after.get(after.size() - 1).asText());
    }
    assertTrue(output.path("edits").path("1.0").path("4").get(3).isNull());
  }

  @Test void globalPlaybackProjectionExcludesOldAndUnknownFields() throws Exception {
    var source = mapper.readTree("""
      {"v":1,"edits":{"fid/example":{"4":{"type":4,"timeInSec":2,"fid":"example","srnId":5,
      "oldBlurValue":99,"oldFilterPropertyValue":"SECRET","newBlurValue":4,
      "newFilterPropertyValue":"blur(4px)","futureHistory":"SECRET"}}}}
      """);
    var output = PublishedEdits.project(source, true);
    assertFalse(output.toString().contains("SECRET"));
    assertFalse(output.toString().contains("oldBlurValue"));
    assertEquals("blur(4px)", output.path("edits").path("fid/example").path("4").path("newFilterPropertyValue").asText());
  }

  @Test void malformedOrUnknownEditFormatsCannotSilentlyPublishPrivateValues() throws Exception {
    for (String json : new String[]{"{}", "{\"edits\":{\"1\":{\"99\":[]}}}",
        "{\"edits\":{\"1\":{\"1\":[1]}}}", "{\"edits\":{\"1\":null}}"}) {
      var source = mapper.readTree(json);
      assertThrows(IllegalArgumentException.class, () -> PublishedEdits.project(source, false));
    }
  }

  @Test void redactionDimensionsArePreservedButCannotCarryPrivateMetadata() throws Exception {
    var source = mapper.readTree("""
      {"v":1,"edits":{"1":{"4":[1,0,4,"","blur(4px)","fid",{"width":220,"height":60,"private":"SECRET"}]}}}
      """);
    var result = PublishedEdits.project(source, false);
    assertFalse(result.toString().contains("SECRET"));
    assertEquals(220, result.path("edits").path("1").path("4").get(6).path("width").asInt());
  }
}
