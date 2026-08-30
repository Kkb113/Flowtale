package com.sharefable.analytics.repo;

import com.sharefable.analytics.entity.MEntityMetricsDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MEntityMetricsDailyRepo extends JpaRepository<MEntityMetricsDaily, Long> {
  List<MEntityMetricsDaily> getMEntityMetricsDailiesByEntityId(Long entityId);
}
