package com.sharefable.api.service;

import com.amazonaws.services.s3.model.AmazonS3Exception;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.DemoEntity;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PublicationLifecycleTest {
  private final S3Service storage = mock(S3Service.class);
  private final S3Config config = mock(S3Config.class);
  private final PublicationCacheInvalidator cache = mock(PublicationCacheInvalidator.class);
  private final PublicationLifecycle lifecycle = new PublicationLifecycle(storage, config, cache);
  private final DemoEntity demo = DemoEntity.builder().rid("current").assetPrefixHash("owned")
    .entityType(TopLevelEntityType.TOUR).build();

  private void paths() {
    when(config.getQualifiedPathFor(any(), anyString(), anyString())).thenAnswer(call ->
      AssetFilePath.builder().bucketName("fixture").fullQualifiedPath(
        "root/" + call.getArgument(0) + "/" + call.getArgument(1) + "/" + call.getArgument(2)).build());
  }

  @Test void removesAllAliasesAndOnlyPublicationOwnedPrefixesBeforeInvalidatingCache() throws Exception {
    paths();
    when(storage.getObjectContent(any())).thenReturn("[\"old\",\"current\"]".getBytes(StandardCharsets.UTF_8));
    lifecycle.remove(demo);
    var prefix = org.mockito.ArgumentCaptor.forClass(AssetFilePath.class);
    verify(storage, times(4)).deletePrefix(prefix.capture());
    assertEquals(java.util.List.of("root/PublishedTour/old/", "root/PublishedTour/current/", "root/Tour/owned/",
      "root/PublishedTour/assets-owned/"), prefix.getAllValues().stream().map(AssetFilePath::getFullQualifiedPath).toList());
    var order = inOrder(storage, cache);
    order.verify(cache).requireConfigured();
    order.verify(storage).getObjectContent(any());
    order.verify(storage, times(4)).deletePrefix(any());
    order.verify(cache).invalidate(anyList());
  }

  @Test void missingHistoricalRegistryStopsDeletionBeforeAnyObjectIsRemoved() throws Exception {
    paths();
    demo.setLastPublishedDate(new Timestamp(System.currentTimeMillis()));
    var missing = new AmazonS3Exception("missing");
    missing.setStatusCode(404);
    when(storage.getObjectContent(any())).thenThrow(missing);
    assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> lifecycle.remove(demo));
    verify(storage, never()).deletePrefix(any());
  }

  @Test void failedStorageRemovalDoesNotReportCacheCompletion() throws Exception {
    paths();
    when(storage.getObjectContent(any())).thenReturn("[]".getBytes(StandardCharsets.UTF_8));
    doThrow(new IllegalStateException("failed")).when(storage).deletePrefix(any());
    assertThrows(IllegalStateException.class, () -> lifecycle.remove(demo));
    verify(cache, never()).invalidate(anyList());
  }

  @Test void cdnDeploymentCannotSilentlySkipInvalidation() {
    when(config.getCdn()).thenReturn("cdn.example.invalid");
    assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> new PublicationCacheInvalidator(config, "").requireConfigured());
    when(config.getCdn()).thenReturn("");
    assertDoesNotThrow(() -> new PublicationCacheInvalidator(config, "").invalidate(java.util.List.of("/root/tour/owned/*")));
  }
}
