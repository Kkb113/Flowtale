package com.sharefable.api.transport;

import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;

@GenerateTSDef
@Builder
@Data
@EqualsAndHashCode(callSuper = true)
public class MediaTypeEntityHolding extends EntityHoldingInfoBase {
    public static final String DISCRIMINATOR = "media";
    private String[] fullFilePaths;
    @Builder.Default
    private Boolean deletable = true;

    @Override
    public String getType() {
        return DISCRIMINATOR;
    }
}
