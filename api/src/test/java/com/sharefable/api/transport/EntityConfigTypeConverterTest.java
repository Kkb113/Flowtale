package com.sharefable.api.transport;

import com.sharefable.api.common.EntityConfigConfigType;
import com.sharefable.api.common.EntityConfigTypeConverter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.junit.jupiter.api.Assertions.*;

class EntityConfigTypeConverterTest {
  private final EntityConfigTypeConverter converter = new EntityConfigTypeConverter();

  @ParameterizedTest
  @EnumSource(EntityConfigConfigType.class)
  void preservesOrdinalTextAndReadsLegacyNames(EntityConfigConfigType type) {
    assertEquals(type, converter.convertToEntityAttribute(converter.convertToDatabaseColumn(type)));
    assertEquals(type, converter.convertToEntityAttribute(type.name()));
  }

  @Test void retainsThePublishedGlobalOptionsEncoding() {
    assertEquals("2", converter.convertToDatabaseColumn(EntityConfigConfigType.GLOBAL_OPTS));
    assertNull(converter.convertToDatabaseColumn(null));
    assertNull(converter.convertToEntityAttribute(null));
    assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute("unsupported"));
  }
}
