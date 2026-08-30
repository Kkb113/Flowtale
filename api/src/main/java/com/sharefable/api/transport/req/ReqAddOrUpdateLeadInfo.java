package com.sharefable.api.transport.req;

import com.sharefable.api.common.LeadInfoKey;
import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public record ReqAddOrUpdateLeadInfo(
  Long tourId,
  String emailId,
  String value,
  LeadInfoKey key
) {
}
