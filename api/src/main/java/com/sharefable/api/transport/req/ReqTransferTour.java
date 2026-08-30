package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;

import java.util.List;

@GenerateTSDef
public record ReqTransferTour(String email, Long orgId, List<String> rids) {
}
