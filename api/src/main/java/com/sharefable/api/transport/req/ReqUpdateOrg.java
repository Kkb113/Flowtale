package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OrgInfo;

@GenerateTSDef
public record ReqUpdateOrg(OrgInfo orgInfo) {
}
