package com.sharefable.api.transport;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@ToString(callSuper = true)
@SuperBuilder(toBuilder = true)
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TourManifest {
    private Integer version;
    private String name;
    private String url;
    private List<ScreenAssets> screenAssets;
}
