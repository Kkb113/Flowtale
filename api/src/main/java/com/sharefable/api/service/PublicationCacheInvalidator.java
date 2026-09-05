package com.sharefable.api.service;

import com.amazonaws.ClientConfiguration;
import com.amazonaws.services.cloudfront.AmazonCloudFront;
import com.amazonaws.services.cloudfront.AmazonCloudFrontClientBuilder;
import com.amazonaws.services.cloudfront.model.*;
import com.sharefable.api.config.S3Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class PublicationCacheInvalidator {
  private final S3Config config;
  private final String distribution;

  public PublicationCacheInvalidator(S3Config config,
      @Value("${FABLE_CLOUDFRONT_DISTRIBUTION_ID:}") String distribution) {
    this.config = config;
    this.distribution = distribution;
  }

  public void requireConfigured() {
    if (config.getCdn() != null && !config.getCdn().isBlank() && distribution.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
        "Configure publication CDN invalidation before deleting published demos");
    }
  }

  public void invalidate(List<String> paths) {
    requireConfigured();
    if (config.getCdn() == null || config.getCdn().isBlank()) return;
    // CloudFront permits 15 wildcard paths in flight. A long rename history may evict
    // the containing public namespaces from cache; it never deletes another demo's objects.
    if (paths.size() > 15) paths = paths.stream()
      .map(path -> path.substring(0, path.lastIndexOf('/', path.length() - 3) + 1) + "*").distinct().toList();
    AmazonCloudFront client = createClient();
    try {
      // Unique attempts also invalidate content republished after an earlier failed deletion.
      var batch = new InvalidationBatch().withCallerReference(UUID.randomUUID().toString())
        .withPaths(new Paths().withItems(paths).withQuantity(paths.size()));
      String id = client.createInvalidation(new CreateInvalidationRequest().withDistributionId(distribution)
        .withInvalidationBatch(batch)).getInvalidation().getId();
      long deadline = System.nanoTime() + java.time.Duration.ofSeconds(120).toNanos();
      do {
        var status = client.getInvalidation(new GetInvalidationRequest().withDistributionId(distribution).withId(id));
        if ("Completed".equals(status.getInvalidation().getStatus())) return;
        Thread.sleep(2_000);
      } while (System.nanoTime() < deadline);
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
        "CDN removal is still pending. Retry deletion; completion has not been confirmed");
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Deletion interrupted; retry", error);
    } finally { client.shutdown(); }
  }

  AmazonCloudFront createClient() {
    return AmazonCloudFrontClientBuilder.standard().withRegion("us-east-1")
      .withClientConfiguration(new ClientConfiguration().withConnectionTimeout(5_000).withSocketTimeout(10_000)
        .withRequestTimeout(15_000).withClientExecutionTimeout(20_000).withMaxErrorRetry(1)).build();
  }
}
