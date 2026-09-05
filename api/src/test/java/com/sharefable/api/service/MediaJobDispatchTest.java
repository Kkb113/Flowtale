package com.sharefable.api.service;

import com.sharefable.api.entity.Job;
import com.sharefable.api.repo.JobRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.transport.*;
import com.sharefable.api.transport.resp.MediaType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MediaJobDispatchTest {
  @AfterEach void cleanup() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization();
  }

  @Test void committedPendingWorkSurvivesAQueueFailureAndRecoversOnTheNextSweep() {
    JobRepo jobs = mock(JobRepo.class);
    QMsgService queue = mock(QMsgService.class);
    var info = AudioTranscodingJobInfo.builder().key("key").sub(AudioProcessingSub.CONVERT_TO_WEBM).build();
    Job job = Job.builder().jobType(JobType.TRANSCODE_AUDIO).info(info).build();
    when(jobs.findFirst100ByProcessingStatusAndJobTypeInOrderByCreatedAtAsc(any(), any())).thenReturn(List.of(job));
    doThrow(new RuntimeException("Queue offline")).doNothing().when(queue).sendSqsMessage("TRANSCODE_AUDIO", info);
    MediaJobDispatcher dispatcher = new MediaJobDispatcher(jobs, queue);
    assertDoesNotThrow(dispatcher::recoverPending);
    assertDoesNotThrow(dispatcher::recoverPending);
    verify(queue, times(2)).sendSqsMessage("TRANSCODE_AUDIO", info);
    verify(jobs, never()).save(any());
  }

  @Test void onlyCommitDispatchesNewWorkAndRetriesReuseTheOriginalRecord() {
    JobRepo jobs = mock(JobRepo.class);
    MediaJobDispatcher dispatcher = mock(MediaJobDispatcher.class);
    when(jobs.save(any())).thenAnswer(invocation -> { Job job = invocation.getArgument(0); job.setId(8L); return job; });
    var service = new MediaProcessingService(jobs, dispatcher, mock(EntityHoldingService.class),
      mock(MediaSourceValidator.class), mock(OrgRepo.class));
    TransactionSynchronizationManager.initSynchronization();
    var first = service.submitTranscoding(AudioProcessingSub.CONVERT_TO_WEBM, "https://bucket/source.webm",
      "https://bucket/source", JobType.TRANSCODE_AUDIO, MediaType.AUDIO_WEBM);
    verifyNoInteractions(dispatcher);
    var syncs = TransactionSynchronizationManager.getSynchronizations();
    assertEquals(1, syncs.size());
    syncs.forEach(sync -> sync.afterCommit());
    verify(dispatcher).dispatch(any());
    Job existing = Job.builder().jobKey("key").processingStatus(JobProcessingStatus.Processed).build();
    existing.setId(first.getJobId());
    when(jobs.findFirstByJobTypeAndJobKey(any(), any())).thenReturn(Optional.of(existing));
    var retried = service.submitTranscoding(AudioProcessingSub.CONVERT_TO_WEBM, "https://bucket/source.webm",
      "https://bucket/source", JobType.TRANSCODE_AUDIO, MediaType.AUDIO_WEBM);
    assertEquals(first.getJobId(), retried.getJobId());
    assertEquals(JobProcessingStatus.Processed, retried.getProcessingState());
    verify(jobs, times(1)).save(any());
    assertEquals(1, TransactionSynchronizationManager.getSynchronizations().size());
  }
}
