package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.PvtAssetType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;

import java.net.URL;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PrivateUploadServiceTest {
  S3Config config = mock(S3Config.class);
  S3Service storage = mock(S3Service.class);
  PrivateUploadService service = new PrivateUploadService(config, storage);

  User member(long orgId) {
    Org org = new Org(); org.setId(orgId);
    return User.builder().active(true).belongsToOrg(orgId).orgs(Set.of(org)).build();
  }

  @Test void scopesEveryPrivateKeyToTheAuthenticatedWorkspace() throws Exception {
    when(config.getQualifiedPathFor(any(), anyString(), anyString())).thenAnswer(call ->
      AssetFilePath.builder().privateFile(true).fullQualifiedPath("local/root/tour_data/" + call.getArgument(1) + "/llmops/" + call.getArgument(2)).build());
    when(storage.preSignedUrl(any(), anyString())).thenReturn(new URL("https://private.example/signed"));
    var first = service.create(member(1), "image/png", "capture-session", "frame.png", PvtAssetType.MarkedImgs);
    var second = service.create(member(2), "image/png", "capture-session", "frame.png", PvtAssetType.MarkedImgs);
    assertEquals("local/root/tour_data/org/1/capture-session/llmops/frame.png", first.getObjectKey());
    assertNotEquals(first.getObjectKey(), second.getObjectKey());
    verify(config).getQualifiedPathFor(S3Config.AssetType.PvtTourLlmOpsAssets, "org/1/capture-session", "frame.png");
  }

  @ParameterizedTest @ValueSource(strings = {"../other", "org/2/capture", "%2e%2e", "capture/session", "x", "capture?secret"})
  void rejectsPathsInsteadOfSessionIdentifiers(String session) {
    assertEquals(400, assertThrows(ResponseStatusException.class,
      () -> service.create(member(1), "image/png", session, "frame.png", PvtAssetType.MarkedImgs)).getStatusCode().value());
    verifyNoInteractions(storage, config);
  }

  @ParameterizedTest @ValueSource(strings = {"../other.png", "other/frame.png", "x\\frame.png", "%2e%2e.png", "frame..png"})
  void rejectsFilenamesThatCouldEscapeTheirCapture(String filename) {
    assertThrows(ResponseStatusException.class, () -> service.create(member(1), "image/png", "capture-session", filename, PvtAssetType.MarkedImgs));
    verifyNoInteractions(storage, config);
  }

  @Test void requiresMembershipAndTheDeclaredAssetMediaType() {
    User revoked = member(1); revoked.setBelongsToOrg(2L);
    assertEquals(403, assertThrows(ResponseStatusException.class,
      () -> service.create(revoked, "image/png", "capture-session", "frame.png", PvtAssetType.MarkedImgs)).getStatusCode().value());
    assertThrows(ResponseStatusException.class,
      () -> service.create(member(1), "text/html", "capture-session", "frame.html", PvtAssetType.MarkedImgs));
    assertThrows(ResponseStatusException.class,
      () -> service.create(member(1), "image/png", "capture-session", "index.json", PvtAssetType.TourInputData));
    verifyNoInteractions(storage, config);
  }
}
