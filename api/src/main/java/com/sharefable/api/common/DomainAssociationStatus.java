package com.sharefable.api.common;

import com.amazonaws.services.amplify.model.DomainStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DomainAssociationStatus {
  private DomainStatus apexDomainVerificationStatus;
  private String subdomainName;
  private boolean isSubdomainVerified;
  private String subdomainDNSRecords;
  private String certificateVerificationDNSRecords;
  private String statusReason;
}
