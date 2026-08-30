package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@GenerateTSDef
public class ReqCreateOrDeleteNewVanityDomain {
  String domainName;
  String subdomainName;
  String apexDomainName;
}
