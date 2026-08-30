package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonValue;

@GenerateTSDef
public enum ScreenType {
    // We need keep the enum in order alongside the value in strict order as the ScreenType is saved in db as
    // ordinal encoding + the schema migration sets up ADD COLUMN type INTEGER DEFAULT 1 and in our case SerDom
    // will be the default value for all the existing screen
    Img(0), SerDom(1);

    public final Integer value;

    ScreenType(Integer value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }
}
