package com.sharefable.api.repo;

import com.sharefable.api.entity.Org;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface OrgRepo extends CrudRepository<Org, Long> {
  Optional<Org> findFirstByRid(String rId);

  Set<Org> findOrgByDomain(String emailDomain);
}
