package com.sharefable.api.repo;

import com.sharefable.api.entity.Screen;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ScreenRepo extends CrudRepository<Screen, Long> {
  List<Screen> findAllByBelongsToOrgOrderByUpdatedAtDesc(Long belongsToOrgId);

  Optional<Screen> findByRid(String rid);
  boolean existsByThumbnailAndBelongsToOrg(String thumbnail, Long belongsToOrg);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM Screen s WHERE s.rid = :rid")
  Optional<Screen> findByRidForUpdate(@Param("rid") String rid);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM Screen s WHERE s.id = :id")
  Optional<Screen> findByIdForUpdate(@Param("id") Long id);

  List<Screen> findAllByIdIn(Set<Long> id);
}
