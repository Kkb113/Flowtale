package com.sharefable.api.common;

import org.apache.commons.lang3.EnumUtils;

public enum ImageType {
    PNG("png"),
    JPEG("jpeg"),
    Unknown("na");

    public final String type;

    ImageType(String type) {
        this.type = type;
    }

    public static ImageType de(String rawType) {
        ImageType type = EnumUtils.getEnumIgnoreCase(ImageType.class, rawType);
        if (type == null) {
            return ImageType.Unknown;
        }
        return type;
    }
}
