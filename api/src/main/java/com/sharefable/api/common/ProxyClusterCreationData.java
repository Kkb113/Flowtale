package com.sharefable.api.common;

import com.sharefable.api.config.CustomDomainProxyCluster;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProxyClusterCreationData {
  private boolean isApexDomainPresent;
  private CustomDomainProxyCluster cluster;
}
