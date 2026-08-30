package com.sharefable.api.transport.req;

import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public record ReqDuplicateTour(String duplicateTourName, String fromTourRid) {

    public ReqDuplicateTour normalizeDisplayName() {
        return new ReqDuplicateTour(Utils.normalizeWhitespace(duplicateTourName), fromTourRid);
    }
}
