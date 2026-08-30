package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.VanityDomain;
import com.sharefable.api.common.VanityDomainDeploymentStatus;
import com.sharefable.api.common.VanityDomainRecords;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.OptionalPropInTS;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.sql.Timestamp;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
@GenerateTSDef
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RespVanityDomain {
  public String subdomainName;
  public String apexDomainName;
  private String domainName;
  private Timestamp createdAt;
  private VanityDomainDeploymentStatus status;
  private List<VanityDomainRecords> records;
  @OptionalPropInTS
  private String rejectionReason;

  public static RespVanityDomain from(VanityDomain vanityDomain) {
    RespVanityDomain resp = new RespVanityDomain();
    resp.setDomainName(vanityDomain.getDomainName());
    resp.setSubdomainName(vanityDomain.getSubdomainName());
    resp.setApexDomainName(vanityDomain.getApexDomainName());
    resp.setRecords(vanityDomain.getRecords());
    resp.setStatus(vanityDomain.getStatus());
    resp.setCreatedAt(vanityDomain.getCreatedAt());
    resp.setRejectionReason(vanityDomain.getRejectionReason());
    return resp;
  }
}
