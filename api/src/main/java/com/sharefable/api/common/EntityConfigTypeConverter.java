package com.sharefable.api.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** The deployed column is VARCHAR; older writers stored ordinal text, and some imports stored names. */
@Converter
public class EntityConfigTypeConverter implements AttributeConverter<EntityConfigConfigType, String> {
  @Override
  public String convertToDatabaseColumn(EntityConfigConfigType value) {
    if (value == null) return null;
    return switch (value) {
      case VANITY_DOMAIN -> "0";
      case CUSTOM_FORM_FIELDS -> "1";
      case GLOBAL_OPTS -> "2";
      case AI_CREDIT -> "3";
      case DATASET -> "4";
      case _EXP_ -> "5";
    };
  }

  @Override
  public EntityConfigConfigType convertToEntityAttribute(String value) {
    if (value == null) return null;
    return switch (value) {
      case "0", "VANITY_DOMAIN" -> EntityConfigConfigType.VANITY_DOMAIN;
      case "1", "CUSTOM_FORM_FIELDS" -> EntityConfigConfigType.CUSTOM_FORM_FIELDS;
      case "2", "GLOBAL_OPTS" -> EntityConfigConfigType.GLOBAL_OPTS;
      case "3", "AI_CREDIT" -> EntityConfigConfigType.AI_CREDIT;
      case "4", "DATASET" -> EntityConfigConfigType.DATASET;
      case "5", "_EXP_" -> EntityConfigConfigType._EXP_;
      default -> throw new IllegalArgumentException("Unknown persisted entity configuration type");
    };
  }
}
