package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;

import java.io.Serializable;
import java.util.Objects;
import java.util.Random;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(
        name = MediaTypeEntityHolding.DISCRIMINATOR,
        value = MediaTypeEntityHolding.class
    )
})
@Data
@GenerateTSDef
public abstract class EntityHoldingInfoBase implements Serializable {
    private final Long __id = new Random().nextLong() & 0xffffffffL;

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME)
    public abstract String getType();

    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof JobProcessingInfo that)) return false;
        return Objects.equals(get__id(), that.get__id());
    }

    @Override
    public int hashCode() {
        return Objects.hash(get__id());
    }
}
