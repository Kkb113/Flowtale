package com.sharefable.api.repo;

import com.sharefable.api.entity.ApiKey;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApiKeyRepo extends CrudRepository<ApiKey, Long> {
  List<ApiKey> getApiKeysByOrgId(Long orgId);

  ApiKey getApiKeyByApiKeyAndActiveIsTrue(String apiKey);

  ApiKey getFirstApiKeyByOrgIdAndActiveIsTrueOrderByUpdatedAtDesc(Long orgId);
}
