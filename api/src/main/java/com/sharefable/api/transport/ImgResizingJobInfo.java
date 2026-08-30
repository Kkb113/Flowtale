package com.sharefable.api.transport;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true)
@GenerateTSDef
@SuperBuilder(toBuilder = true)
@Data
public class ImgResizingJobInfo extends JobProcessingInfo {
    public static final String DISCRIMINATOR = "RESIZE_IMG";

    private String sourceFilePath;

    private String processedFilePath;

    private String resolution;

    @Override
    public String getType() {
        return DISCRIMINATOR;
    }
}
