package com.sharefable.api.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VanityDomain {
  public String subdomainName;
  public String apexDomainName;
  private String domainName;
  private Timestamp createdAt;
  private String cluster;
  private VanityDomainDeployedOn deployedOn;
  private VanityDomainDeploymentStatus status;
  private List<VanityDomainRecords> records;
  private String rejectionReason;
}
