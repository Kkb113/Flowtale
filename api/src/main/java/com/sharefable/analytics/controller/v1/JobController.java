package com.sharefable.analytics.controller.v1;

import com.sharefable.Routes;
import com.sharefable.analytics.common.AnalyticsJobType;
import com.sharefable.analytics.common.ProcessingStatus;
import com.sharefable.analytics.entity.AnalyticsJob;
import com.sharefable.analytics.repo.AnalyticsJobRepo;
import com.sharefable.analytics.transport.ReqNewAnalyticsJob;
import com.sharefable.analytics.transport.ReqUpdateAnalyticsJob;
import com.sharefable.api.common.ApiResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(Routes.API_V1)
@RequiredArgsConstructor
@Slf4j
public class JobController {
  private final AnalyticsJobRepo repo;


  @RequestMapping(value = Routes.CREATE_JOB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<AnalyticsJob> newJob(@RequestBody ReqNewAnalyticsJob req) {
    AnalyticsJob job = AnalyticsJob.builder()
      .jobType(req.getJobType())
      .jobKey(req.getJobKey())
      .jobStatus(req.getJobStatus())
      .lowWatermark(req.getLowWatermark())
      .highWatermark(req.getHighWatermark())
      .jobData(req.getJobData())
      .build();

    return ApiResp.<AnalyticsJob>builder().data(repo.save(job)).build();
  }


  @RequestMapping(value = Routes.UPDATE_JOB, method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<AnalyticsJob> updateJob(@RequestBody ReqUpdateAnalyticsJob req, @PathVariable("id") Long jobId) {
    AnalyticsJob job = repo.findById(jobId).orElseThrow(() -> new RuntimeException("Job not found"));

    if (req.getJobStatus() != null) job.setJobStatus(req.getJobStatus());
    if (req.getLowWatermark() != null) job.setLowWatermark(req.getLowWatermark());
    if (req.getHighWatermark() != null) job.setHighWatermark(req.getHighWatermark());
    if (req.getJobData() != null) job.setJobData(req.getJobData());
    if (req.getFailureReason() != null) job.setFailureReason(req.getFailureReason());

    return ApiResp.<AnalyticsJob>builder().data(repo.save(job)).build();
  }


  @RequestMapping(value = Routes.GET_LAST_SUCCESSFUL_JOB, method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
  public ApiResp<AnalyticsJob> getLastSuccessfulJob(@PathVariable("type") AnalyticsJobType jobType) {
    AnalyticsJob job = repo.findFirstByJobTypeAndJobStatusOrderByUpdatedAtDesc(jobType, ProcessingStatus.Successful).orElse(null);
    return ApiResp.<AnalyticsJob>builder().data(job).build();
  }
}
