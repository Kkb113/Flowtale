package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.MapSerializable;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.SuperBuilder;

import java.util.Map;
import java.util.Objects;
import java.util.Random;

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(
        name = VideoTranscodingJobInfo.DISCRIMINATOR,
        value = VideoTranscodingJobInfo.class
    ),
    @JsonSubTypes.Type(
        name = ImgResizingJobInfo.DISCRIMINATOR,
        value = ImgResizingJobInfo.class
    ),
})
@Data
@GenerateTSDef
@SuperBuilder(toBuilder = true)
public abstract class JobProcessingInfo implements MapSerializable {
    @JsonIgnore
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Long __id = new Random().nextLong() & 0xffffffffL;
    @Builder.Default
    private String duration = "-1s";
    private String key;

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME)
    public abstract String getType();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof JobProcessingInfo that)) return false;
        return Objects.equals(get__id(), that.get__id());
    }

    @Override
    public int hashCode() {
        return Objects.hash(get__id());
    }

    @Override
    public Map<String, String> toMap() {
        return objectMapper.convertValue(this, new TypeReference<>() {
        });
    }
}
