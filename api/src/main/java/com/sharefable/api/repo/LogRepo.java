package com.sharefable.api.repo;

import com.sharefable.api.common.ForObjectType;
import com.sharefable.api.common.LogType;
import com.sharefable.api.entity.Log;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LogRepo extends CrudRepository<Log, Long> {
  Optional<Log> getFirstLogByOrgIdAndLogTypeAndForObjectTypeAndForObjectKeyOrderByUpdatedAtDesc(
    Long orgId,
    LogType logType,
    ForObjectType forObjectType,
    String forObjectKey
  );
}
