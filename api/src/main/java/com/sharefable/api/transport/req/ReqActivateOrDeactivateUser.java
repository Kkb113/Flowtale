package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public record ReqActivateOrDeactivateUser(
    Long userId,
    Boolean shouldActivate
) {
}
