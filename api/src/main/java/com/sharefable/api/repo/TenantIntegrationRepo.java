package com.sharefable.api.repo;

import com.sharefable.api.entity.TenantIntegration;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenantIntegrationRepo extends CrudRepository<TenantIntegration, Long> {
  List<TenantIntegration> getTenantIntegrationsByOrgIdAndIntegrationIdIn(
    Long orgId,
    List<Long> integrationIds
  );

  void deleteTenantIntegrationByOrgIdAndId(Long orgId, Long tenantIntegrationId);

  void deleteTenantIntegrationsByOrgIdAndIdIn(Long orgId, List<Long> ids);

  List<TenantIntegration> getTenantIntegrationsByOrgIdAndEventAndTourIdIn(Long orgId, String event, List<Long> tourIds);
}
