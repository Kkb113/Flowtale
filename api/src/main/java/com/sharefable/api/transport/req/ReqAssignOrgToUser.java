package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import java.util.Optional;

@GenerateTSDef
public record ReqAssignOrgToUser(Long orgId, Optional<String> inviteCode) {
}
