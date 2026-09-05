package com.sharefable.api.repo;

import com.sharefable.api.entity.Job;
import com.sharefable.api.transport.JobType;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.Collection;
import com.sharefable.api.transport.JobProcessingStatus;

@Repository
public interface JobRepo extends CrudRepository<Job, Long> {
    Optional<Job> findFirstByJobTypeAndJobKey(JobType jobType, String jobKey);
    List<Job> findFirst100ByProcessingStatusAndJobTypeInOrderByCreatedAtAsc(
      JobProcessingStatus status, Collection<JobType> types);
}
