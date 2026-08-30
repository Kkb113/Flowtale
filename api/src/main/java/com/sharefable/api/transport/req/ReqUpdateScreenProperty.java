package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public record ReqUpdateScreenProperty(String rid, String propName, Object propValue) {
}
