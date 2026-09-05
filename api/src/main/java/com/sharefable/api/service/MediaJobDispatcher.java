package com.sharefable.api.service;

import com.sharefable.api.entity.Job;
import com.sharefable.api.repo.JobRepo;
import com.sharefable.api.transport.JobProcessingStatus;
import com.sharefable.api.transport.JobType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/** Committed Touched rows are durable pending work; queue sends may repeat until a worker claims them. */
@Service
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class MediaJobDispatcher {
  private final JobRepo jobs;
  private final QMsgService queue;

  public void dispatch(Job job) {
    try {
      queue.sendSqsMessage(job.getJobType().name(), job.getInfo());
    } catch (RuntimeException error) {
      // No source URL, raw queue message or credentials in diagnostics. The row remains retryable.
      log.warn("Media job {} remains pending; queue dispatch will retry", job.getId());
    }
  }

  @Scheduled(initialDelayString = "${com.sharefable.media.dispatch-delay-ms:30000}",
    fixedDelayString = "${com.sharefable.media.dispatch-delay-ms:30000}")
  public void recoverPending() {
    for (Job job : jobs.findFirst100ByProcessingStatusAndJobTypeInOrderByCreatedAtAsc(
      JobProcessingStatus.Touched, List.of(JobType.TRANSCODE_VIDEO, JobType.TRANSCODE_AUDIO))) {
      dispatch(job);
    }
  }
}
