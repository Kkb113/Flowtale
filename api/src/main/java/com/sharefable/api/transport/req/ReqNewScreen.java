package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.ScreenType;

import java.util.Optional;

import static com.sharefable.api.common.Utils.normalizeWhitespace;

@GenerateTSDef
public record ReqNewScreen(
    String name,
    Optional<String> url,
    Optional<String> thumbnail, // base64 image data
    Optional<String> favIcon,
    ScreenType type,
    Optional<String> contentType,
    String body
) {
    public Long normalizedParentId() {
        return 0L;
    }

    public ReqNewScreen normalizeDisplayName() {
        return new ReqNewScreen(normalizeWhitespace(name()), url(), thumbnail(), favIcon(), type(), contentType(), body());
    }
}
