package com.sharefable.analytics.repo;

import com.sharefable.analytics.common.AnalyticsJobType;
import com.sharefable.analytics.common.ProcessingStatus;
import com.sharefable.analytics.entity.AnalyticsJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnalyticsJobRepo extends JpaRepository<AnalyticsJob, Long> {
  Optional<AnalyticsJob> findFirstByJobTypeAndJobStatusOrderByUpdatedAtDesc(AnalyticsJobType jobType, ProcessingStatus status);
}
