package com.sharefable.api.service;

import com.amazonaws.services.cloudfront.AmazonCloudFront;
import com.amazonaws.services.cloudfront.model.*;
import com.sharefable.api.config.S3Config;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicationCacheInvalidatorTest {
  @Test void deletionWaitsForTheProviderAcknowledgementAndReleasesTheClient() {
    var config = new S3Config();
    config.setCdn("fixture.cloudfront.net");
    var invalidator = spy(new PublicationCacheInvalidator(config, "fixture-distribution"));
    var client = mock(AmazonCloudFront.class);
    doReturn(client).when(invalidator).createClient();
    when(client.createInvalidation(any())).thenReturn(new CreateInvalidationResult()
      .withInvalidation(new Invalidation().withId("attempt")));
    when(client.getInvalidation(any())).thenReturn(new GetInvalidationResult()
      .withInvalidation(new Invalidation().withStatus("Completed")));
    invalidator.invalidate(java.util.stream.IntStream.range(0, 20).mapToObj(i -> "/root/ptour/alias-" + i + "/*").toList());
    var request = org.mockito.ArgumentCaptor.forClass(CreateInvalidationRequest.class);
    verify(client).createInvalidation(request.capture());
    assertEquals("fixture-distribution", request.getValue().getDistributionId());
    assertEquals(java.util.List.of("/root/ptour/*"), request.getValue().getInvalidationBatch().getPaths().getItems());
    assertFalse(request.getValue().getInvalidationBatch().getCallerReference().isBlank());
    verify(client).getInvalidation(any());
    verify(client).shutdown();
  }

  @Test void providerFailureCannotBeTreatedAsCompletedDeletion() {
    var config = new S3Config();
    config.setCdn("fixture.cloudfront.net");
    var invalidator = spy(new PublicationCacheInvalidator(config, "fixture-distribution"));
    var client = mock(AmazonCloudFront.class);
    doReturn(client).when(invalidator).createClient();
    when(client.createInvalidation(any())).thenThrow(new IllegalStateException("provider unavailable"));
    assertThrows(IllegalStateException.class, () -> invalidator.invalidate(java.util.List.of("/root/ptour/demo/*")));
    verify(client).shutdown();
  }
}
