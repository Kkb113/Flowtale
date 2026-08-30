package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonValue;

@GenerateTSDef
public enum JobProcessingStatus {
    Failed(0),
    Touched(1),
    InProcess(2),
    Processed(3);

    public final Integer value;

    JobProcessingStatus(Integer value) {
        this.value = value;
    }

    @JsonValue
    public int getValue() {
        return value;
    }
}
