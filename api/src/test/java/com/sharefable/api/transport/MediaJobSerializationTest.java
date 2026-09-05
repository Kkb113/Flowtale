package com.sharefable.api.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MediaJobSerializationTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test void roundTripsBothActiveJobTypesAndTheirIdentity() throws Exception {
    JobProcessingInfo[] jobs = {
      AudioTranscodingJobInfo.builder().sourceFilePath("source").processedFilePath("out")
        .key("key").sub(AudioProcessingSub.CONVERT_TO_WEBM).build(),
      VideoTranscodingJobInfo.builder().sourceFilePath("source").processedFilePath("out")
        .key("key").sub(VideoProcessingSub.CONVERT_TO_HLS).build(),
    };
    for (JobProcessingInfo job : jobs) {
      JobProcessingInfo restored = mapper.readValue(mapper.writeValueAsBytes(job), JobProcessingInfo.class);
      assertEquals(job.getClass(), restored.getClass());
      assertEquals(job.toMap(), restored.toMap());
      assertEquals(job, restored);
    }
  }

  @Test void roundTripsMediaAssociationsAndPreservesEquality() throws Exception {
    MediaTypeEntityHolding holding = MediaTypeEntityHolding.builder().fullFilePaths(new String[]{"source", "output"}).build();
    EntityHoldingInfoBase restored = mapper.readValue(mapper.writeValueAsBytes(holding), EntityHoldingInfoBase.class);
    assertEquals(holding, restored);
    assertEquals(holding.hashCode(), restored.hashCode());
    assertNotEquals(holding, MediaTypeEntityHolding.builder().fullFilePaths(new String[]{"source", "output"}).build());
  }

  @Test void unknownJobTypeFailsClosed() {
    assertThrows(Exception.class, () -> mapper.readValue("{\"type\":\"UNSUPPORTED\"}", JobProcessingInfo.class));
  }
}
