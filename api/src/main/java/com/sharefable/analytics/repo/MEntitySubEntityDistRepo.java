package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.MEntitySubEntityDistribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MEntitySubEntityDistRepo extends JpaRepository<MEntitySubEntityDistribution, Long> {
  List<MEntitySubEntityDistribution> getMEntitySubEntityDistributionsByEntityId(Long entityId);
}
