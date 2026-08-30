package com.sharefable.api.transport.req;

import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.GenerateTSDef;

import java.util.Optional;

@GenerateTSDef
public record ReqRenameGeneric(String newName, Optional<String> description, String rid) {
    public ReqRenameGeneric normalizeDisplayName() {
        return new ReqRenameGeneric(Utils.normalizeWhitespace(newName()), description(), rid);
    }
}
