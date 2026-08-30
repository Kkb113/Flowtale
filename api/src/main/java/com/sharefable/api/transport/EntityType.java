package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonValue;

@GenerateTSDef
public enum EntityType {
    Screen(0),
    Tour(1);

    public final Integer value;

    EntityType(Integer value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }
}
