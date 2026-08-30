package com.sharefable.api.service;

import com.amazonaws.services.amplify.AWSAmplify;
import com.amazonaws.services.amplify.AWSAmplifyClient;
import com.amazonaws.services.amplify.model.*;
import com.sharefable.api.common.DomainAssociationStatus;
import com.sharefable.api.common.ProxyClusterCreationData;
import com.sharefable.api.common.VanityDomain;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.CustomDomainProxyCluster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AwsAmplifyCustomDomainService {
  private final AWSAmplify client = AWSAmplifyClient.builder()
    .withRegion("us-east-2")
    .build();

  private final AppSettings appSettings;

  public Optional<ProxyClusterCreationData> getProvisionedClusterForNewSSLCreation(String apexDomain) {
    List<CustomDomainProxyCluster> clusters = appSettings.getCustomDomainProxyClusters();
    List<CustomDomainProxyCluster> availableCluster = new ArrayList<>(clusters.size());

    for (CustomDomainProxyCluster cluster : clusters) {
      ListDomainAssociationsRequest req = new ListDomainAssociationsRequest();
      req.withAppId(cluster.id()).setMaxResults(50);
      ListDomainAssociationsResult res = client.listDomainAssociations(req);
      List<DomainAssociation> domainAssociations = res.getDomainAssociations();

      boolean isApexDomainAlreadyPresent = false;
      for (DomainAssociation domainAssociation : domainAssociations) {
        // if an apex domain is already present then we only add the subdomain
        if (StringUtils.equalsIgnoreCase(domainAssociation.getDomainName(), apexDomain)) {
          isApexDomainAlreadyPresent = true;
        }
      }

      if (isApexDomainAlreadyPresent) return Optional.of(ProxyClusterCreationData.builder()
        .cluster(cluster)
        .isApexDomainPresent(true)
        .build());

      if (domainAssociations.size() < appSettings.getMaxSSLCertPerClusterLimit()) {
        availableCluster.add(cluster);
      }
    }

    return availableCluster.isEmpty() ? Optional.empty() : Optional.of(ProxyClusterCreationData.builder()
      .cluster(availableCluster.get(0))
      .isApexDomainPresent(false)
      .build()
    );
  }

  public void registerNewDomain(CustomDomainProxyCluster cluster, String apexDomainName, List<VanityDomain> subdomains) {
    CreateDomainAssociationRequest req = new CreateDomainAssociationRequest();

    List<SubDomainSetting> settings = subdomains.stream().map(domain -> {
      SubDomainSetting subDomainSetting = new SubDomainSetting();
      return subDomainSetting.withBranchName("master").withPrefix(domain.subdomainName);
    }).toList();
    req.withAppId(cluster.id()).withDomainName(apexDomainName).withSubDomainSettings(settings);
    client.createDomainAssociation(req);
  }

  public DomainAssociationStatus getAssociationStatus(VanityDomain vanityDomain) {
    CustomDomainProxyCluster cluster = getClusterByName(vanityDomain.getCluster());
    GetDomainAssociationRequest req = new GetDomainAssociationRequest();
    req.withAppId(cluster.id()).withDomainName(vanityDomain.getApexDomainName());
    GetDomainAssociationResult resp = client.getDomainAssociation(req);

    String statusReason = resp.getDomainAssociation().getStatusReason();
    DomainStatus domainStatus = DomainStatus.fromValue(
      // For some reason AWAITING_APP_CNAME is not present in enum
      StringUtils.equalsIgnoreCase(resp.getDomainAssociation().getDomainStatus(), "AWAITING_APP_CNAME") ? DomainStatus.PENDING_VERIFICATION.toString() : resp.getDomainAssociation().getDomainStatus()
    );
    List<SubDomain> subdomains = resp.getDomainAssociation().getSubDomains().stream()
      .filter(sub -> StringUtils.equalsIgnoreCase(sub.getSubDomainSetting().getPrefix(), vanityDomain.getSubdomainName()))
      .toList();

    if (!subdomains.isEmpty()) {
      SubDomain sub = subdomains.get(0);
      return DomainAssociationStatus.builder()
        .apexDomainVerificationStatus(domainStatus)
        .statusReason(statusReason)
        .isSubdomainVerified(sub.isVerified())
        .subdomainName(sub.getSubDomainSetting().getPrefix())
        .certificateVerificationDNSRecords(resp.getDomainAssociation().getCertificateVerificationDNSRecord())
        .subdomainDNSRecords(sub.getDnsRecord())
        .build();
    }

    return DomainAssociationStatus.builder()
      .apexDomainVerificationStatus(domainStatus)
      .statusReason(statusReason)
      .build();
  }

  public CustomDomainProxyCluster getClusterByName(String name) {
    List<CustomDomainProxyCluster> customDomainProxyClusters = appSettings.getCustomDomainProxyClusters();
    for (CustomDomainProxyCluster cluster : customDomainProxyClusters) {
      if (StringUtils.equalsIgnoreCase(cluster.name(), name)) {
        return cluster;
      }
    }
    return null;
  }

  public void updateExistingDomain(CustomDomainProxyCluster cluster, String apexDomainName, List<VanityDomain> subdomains) {
    UpdateDomainAssociationRequest req = new UpdateDomainAssociationRequest();
    List<SubDomainSetting> settings = subdomains.stream().map(domain -> {
      SubDomainSetting subDomainSetting = new SubDomainSetting();
      return subDomainSetting.withBranchName("master").withPrefix(domain.subdomainName);
    }).toList();
    req.withAppId(cluster.id()).withDomainName(apexDomainName).withSubDomainSettings(settings);
    client.updateDomainAssociation(req);
  }

  public void updateExistingDomain(String clusterName, String apexDomainName, List<VanityDomain> subdomains) {
    updateExistingDomain(getClusterByName(clusterName), apexDomainName, subdomains);
  }

  public void deleteDomain(String clusterName, String apexDomainName) {
    CustomDomainProxyCluster cluster = getClusterByName(clusterName);

    DeleteDomainAssociationRequest req = new DeleteDomainAssociationRequest();
    req.withAppId(cluster.id()).withDomainName(apexDomainName);
    client.deleteDomainAssociation(req);
  }
}
