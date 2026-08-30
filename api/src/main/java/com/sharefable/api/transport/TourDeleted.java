package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonValue;

@GenerateTSDef
public enum TourDeleted {
  ACTIVE(0),
  DELETED(1);


  public final Integer value;

  TourDeleted(Integer value) {
    this.value = value;
  }

  @JsonValue
  public int getValue() {
    return value;
  }
}
