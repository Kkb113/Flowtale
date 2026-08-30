package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonValue;

@GenerateTSDef
public enum SchemaVersion {
    V1("2023-01-10");

    public final String v;

    SchemaVersion(String v) {
        this.v = v;
    }

    public static SchemaVersion of(String version) {
        for (SchemaVersion sv : SchemaVersion.values()) {
            if (sv.v.equalsIgnoreCase(version)) {
                return sv;
            }
        }
        return null;
    }

    @JsonValue
    public String toValue() {
        return this.v;
    }
}
