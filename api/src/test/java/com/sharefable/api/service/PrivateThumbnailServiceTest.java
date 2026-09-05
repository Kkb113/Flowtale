package com.sharefable.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.ScreenRepo;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PrivateThumbnailServiceTest {
  @Test void suppliedThumbnailReferencesCannotReadAnotherWorkspaceOrInjectADataDerivative() throws Exception {
    var screens = mock(ScreenRepo.class);
    var orgs = mock(OrgRepo.class);
    var storage = mock(S3Service.class);
    var config = mock(S3Config.class);
    var service = new PrivateThumbnailService(screens, orgs, storage, config);
    var data = new ObjectMapper().readTree("{\"data\":{\"thumbnail\":\"foreign.png\",\"thumbnailData\":\"secret\"}}");
    service.project(data, 7L);
    assertFalse(data.path("data").has("thumbnailData"));
    verifyNoInteractions(storage, config);
    verify(screens).existsByThumbnailAndBelongsToOrg("foreign.png", 7L);
  }

  @Test void anOwnedThumbnailIsBoundedAndRenderedWithoutChangingItsCanonicalReference() throws Exception {
    var screens = mock(ScreenRepo.class);
    var orgs = mock(OrgRepo.class);
    var storage = mock(S3Service.class);
    var config = mock(S3Config.class);
    var service = new PrivateThumbnailService(screens, orgs, storage, config);
    var asset = com.sharefable.api.common.AssetFilePath.builder().privateFile(true).build();
    when(screens.existsByThumbnailAndBelongsToOrg("owned.png", 7L)).thenReturn(true);
    when(config.getQualifiedPathFor(S3Config.AssetType.Common, "owned.png")).thenReturn(asset);
    when(storage.getObjectContent(asset)).thenReturn(java.util.Base64.getDecoder().decode(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII="));
    var data = new ObjectMapper().readTree("[{\"thumbnail\":\"owned.png\"},{\"thumbnail\":\"owned.png\"}]");
    service.project(data, 7L);
    assertEquals("owned.png", data.path(0).path("thumbnail").asText());
    assertTrue(data.path(0).path("thumbnailData").asText().startsWith("data:image/jpeg;base64,"));
    assertEquals(data.path(0), data.path(1));
    verify(storage, times(1)).getObjectContent(asset);
  }
}
