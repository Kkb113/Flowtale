package com.sharefable.api.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import com.amazonaws.services.s3.model.DeleteObjectsRequest;
import com.sharefable.api.common.AssetFilePath;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class S3ServiceTest {
  private final AmazonS3 publicClient = mock(AmazonS3.class);
  private final AmazonS3 privateClient = mock(AmazonS3.class);
  private final S3Service service = new S3Service(publicClient, privateClient, publicClient, privateClient);

  private AssetFilePath path(boolean privateFile) {
    var path = new AssetFilePath();
    path.setBucketName("fixture");
    path.setFullQualifiedPath("input");
    path.setPrivateFile(privateFile);
    return path;
  }

  @Test void deletionEnumeratesEveryPageAndVerifiesRemoval() {
    var prefix = path(false);
    prefix.setFullQualifiedPath("root/ptour/owned/");
    var first = new ListObjectsV2Result();
    first.setTruncated(true);
    first.setNextContinuationToken("next");
    var second = new ListObjectsV2Result();
    for (var page : java.util.List.of(first, second)) {
      var object = new S3ObjectSummary();
      object.setKey("root/ptour/owned/" + (page == first ? "first.json" : "second.json"));
      page.getObjectSummaries().add(object);
    }
    when(publicClient.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(first, second, new ListObjectsV2Result());
    service.deletePrefix(prefix);
    var request = org.mockito.ArgumentCaptor.forClass(DeleteObjectsRequest.class);
    verify(publicClient).deleteObjects(request.capture());
    assertEquals(java.util.List.of("root/ptour/owned/first.json", "root/ptour/owned/second.json"),
      request.getValue().getKeys().stream().map(DeleteObjectsRequest.KeyVersion::getKey).toList());
    verifyNoInteractions(privateClient);
  }

  @Test void deletionRejectsUnrelatedObjectsAndUnscopedPrefixes() {
    var prefix = path(false);
    assertThrows(IllegalArgumentException.class, () -> service.deletePrefix(prefix));
    prefix.setFullQualifiedPath("root/ptour/owned/");
    var page = new ListObjectsV2Result();
    var object = new S3ObjectSummary();
    object.setKey("root/ptour/another/index.json");
    page.getObjectSummaries().add(object);
    when(publicClient.listObjectsV2(any(ListObjectsV2Request.class))).thenReturn(page);
    assertThrows(IllegalStateException.class, () -> service.deletePrefix(prefix));
    verify(publicClient, never()).deleteObjects(any(DeleteObjectsRequest.class));
  }

  private static class TrackingStream extends S3ObjectInputStream {
    boolean aborted;
    boolean closed;
    boolean read;
    TrackingStream(InputStream input) { super(input, null); }
    @Override public int read(byte[] bytes, int offset, int length) throws IOException {
      read = true;
      return super.read(bytes, offset, length);
    }
    @Override public void abort() { aborted = true; super.abort(); }
    @Override public void close() throws IOException { closed = true; super.close(); }
  }

  private TrackingStream response(AmazonS3 client, InputStream input, long size) {
    var object = new S3Object();
    var stream = new TrackingStream(input);
    object.setObjectContent(stream);
    object.getObjectMetadata().setContentLength(size);
    when(client.getObject(any(GetObjectRequest.class))).thenReturn(object);
    return stream;
  }

  @Test void privateReadsUseThePrivateClientAndCloseTheirStream() throws Exception {
    byte[] bytes = {1, 2, 3};
    var stream = response(privateClient, new ByteArrayInputStream(bytes), bytes.length);
    assertArrayEquals(bytes, service.getObjectContent(path(true)));
    assertTrue(stream.closed);
    verifyNoInteractions(publicClient);
  }

  @Test void oversizedDeclaredObjectsAbortBeforeReading() throws Exception {
    var stream = response(publicClient, new ByteArrayInputStream(new byte[0]), S3Service.MAX_OBJECT_READ_BYTES + 1L);
    assertThrows(IOException.class, () -> service.getObjectContent(path(false)));
    assertTrue(stream.aborted);
    assertFalse(stream.read);
    assertTrue(stream.closed);
  }

  @Test void readFailuresAbortAndCloseTheConnection() throws Exception {
    var stream = response(publicClient, new InputStream() {
      @Override public int read() throws IOException { throw new IOException("connection interrupted"); }
    }, 100);
    assertThrows(IOException.class, () -> service.getObjectContent(path(false)));
    assertTrue(stream.aborted);
    assertTrue(stream.closed);
  }

  @Test void understatedLengthsCannotBypassTheReadLimit() throws Exception {
    var stream = response(publicClient, new InputStream() {
      private int remaining = S3Service.MAX_OBJECT_READ_BYTES + 1;
      @Override public int read() { return remaining-- > 0 ? 0 : -1; }
      @Override public int read(byte[] buffer, int offset, int length) {
        if (remaining <= 0) return -1;
        int count = Math.min(length, remaining);
        remaining -= count;
        return count;
      }
    }, 1);
    assertThrows(IOException.class, () -> service.getObjectContent(path(false)));
    assertTrue(stream.aborted);
    assertTrue(stream.closed);
  }
}
