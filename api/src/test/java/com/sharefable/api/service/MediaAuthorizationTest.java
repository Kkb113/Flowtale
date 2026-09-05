package com.sharefable.api.service;

import com.sharefable.api.entity.User;
import com.sharefable.api.repo.JobRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.transport.req.ReqMediaProcessing;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MediaAuthorizationTest {
  @Test void unauthorizedDestinationNeverEnqueuesJobs() {
    JobRepo jobs = mock(JobRepo.class);
    MediaJobDispatcher queue = mock(MediaJobDispatcher.class);
    EntityHoldingService holdings = mock(EntityHoldingService.class);
    MediaProcessingService service = new MediaProcessingService(jobs, queue, holdings,
      mock(MediaSourceValidator.class), mock(OrgRepo.class));
    User user = User.builder().belongsToOrg(42L).build();
    ReqMediaProcessing request = new ReqMediaProcessing();
    doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND)).when(holdings).validateOwnership(null, user);
    assertThrows(ResponseStatusException.class, () -> service.transcodeVideoForStreaming(request, user));
    assertThrows(ResponseStatusException.class, () -> service.transcodeAudioForStreaming(request, user));
    verifyNoInteractions(jobs, queue);
  }
}
