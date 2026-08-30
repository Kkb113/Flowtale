package com.sharefable.api.repo;

import com.sharefable.api.entity.ProxyAsset;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProxyAssetRepo extends CrudRepository<ProxyAsset, Long> {
    Optional<ProxyAsset> findProxyAssetByRid(String rid);
}
