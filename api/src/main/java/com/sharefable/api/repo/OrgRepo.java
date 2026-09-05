package com.sharefable.api.repo;

import com.sharefable.api.entity.Org;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

@Repository
public interface OrgRepo extends CrudRepository<Org, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "10000"))
  @Query("select o from Org o where o.id = :id")
  Optional<Org> lockById(@Param("id") Long id);

  Optional<Org> findFirstByRid(String rId);
  boolean existsByIdAndThumbnail(Long id, String thumbnail);

  Set<Org> findOrgByDomain(String emailDomain);
}
