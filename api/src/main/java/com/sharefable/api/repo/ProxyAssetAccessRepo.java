package com.sharefable.api.repo;

import com.sharefable.api.entity.ProxyAssetAccess;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProxyAssetAccessRepo extends CrudRepository<ProxyAssetAccess, String> {}
