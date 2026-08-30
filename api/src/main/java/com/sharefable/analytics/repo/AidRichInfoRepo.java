package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.AidRichInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface AidRichInfoRepo extends JpaRepository<AidRichInfo, Long> {
  @Modifying
  @Transactional
  @Query(value = "INSERT INTO al.aid_rich_info (aid, info1) VALUES (:aid, CAST(:info1 AS JSONB)) " +
    "ON CONFLICT (aid) DO UPDATE SET info1 = al.aid_rich_info.info1 || jsonb_strip_nulls(EXCLUDED.info1)", nativeQuery = true)
  void upsertAidRichInfo(@Param("aid") String aid, @Param("info1") String info1);
}
