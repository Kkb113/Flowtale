package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.MHouseLead;
import com.sharefable.analytics.transport.HouseLeadWithRichInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface MHouseLeadRepo extends JpaRepository<MHouseLead, Long> {
  List<MHouseLead> getMHouseLeadsByEntityIdOrderByLastInteractedAtDesc(Long entityId);

  @Query("SELECT new com.sharefable.analytics.transport.HouseLeadWithRichInfo(h, i) " +
    "FROM MHouseLead h " +
    "LEFT OUTER JOIN AidRichInfo i ON h.aid = i.aid WHERE h.entityId = :entityId ORDER BY h.lastInteractedAt DESC")
  List<HouseLeadWithRichInfo> getHouseLeadsForEntity(Long entityId);

  @Query("SELECT new com.sharefable.analytics.transport.HouseLeadWithRichInfo(h, i) " +
    "FROM MHouseLead h " +
    "LEFT OUTER JOIN AidRichInfo i ON h.aid = i.aid WHERE h.entityId in :entityIds ORDER BY h.lastInteractedAt DESC")
  List<HouseLeadWithRichInfo> getHouseLeadsForEntity(Set<Long> entityIds);
}
