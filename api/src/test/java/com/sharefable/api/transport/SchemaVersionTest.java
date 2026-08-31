package com.sharefable.api.transport;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class SchemaVersionTest {
  @Test
  void resolvesCurrentAndNextSchemaVersions() {
    Assertions.assertEquals(SchemaVersion.V1, SchemaVersion.of("2023-01-10"));
    Assertions.assertEquals(SchemaVersion.V2, SchemaVersion.of("2026-08-31"));
    Assertions.assertNull(SchemaVersion.of("2099-01-01"));
  }

  @Test
  void nextSchemaContainsEveryServerTemplate() {
    String base = "/data-schema/v=" + SchemaVersion.V2.toValue();
    String[] paths = {
      "/tour/index.json",
      "/tour/loader.json",
      "/tour/edits.json",
      "/screen/edits.json",
      "/demoHub/index.json",
      "/org/dataset.json"
    };
    for (String path : paths) {
      Assertions.assertNotNull(getClass().getResourceAsStream(base + path), base + path);
    }
  }
}
