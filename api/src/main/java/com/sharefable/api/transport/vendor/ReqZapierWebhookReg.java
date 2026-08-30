package com.sharefable.api.transport.vendor;

import java.util.List;

public record ReqZapierWebhookReg(
  String hookUrl,
  List<Long> tourIds,
  String event
) {
}
