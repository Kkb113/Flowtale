package com.sharefable.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.AppConfig;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.repo.ProxyAssetAccessRepo;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProxyAssetDeliveryTest {
  static final String CSS = "11111111-2222-3333-4444-555555555555";
  static final String IMAGE = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  final ProxyAssetAccessRepo access = mock(ProxyAssetAccessRepo.class);
  final S3Service storage = mock(S3Service.class);
  final S3Config config = new S3Config();
  final Map<String, byte[]> uploads = new HashMap<>();
  final ProxyAssetDelivery service;
  ProxyAssetDeliveryTest() throws Exception {
    config.setAssetBucketName("public"); config.setPvtAssetBucketName("private");
    config.setRegion("us-east-1"); config.setPvtAssetBucketRegion("us-east-1"); config.setRootQualifier("root");
    AppConfig app = new AppConfig(); app.setActiveProfile("local");
    ReflectionTestUtils.setField(config, "appConfig", app);
    service = new ProxyAssetDelivery(access, config, storage);
    when(storage.upload(any(), any(), anyMap())).thenAnswer(call -> {
      AssetFilePath path = call.getArgument(0); uploads.put(path.getFullQualifiedPath(), call.getArgument(1)); return path;
    });
    when(access.existsById("7:" + CSS)).thenReturn(true);
    when(access.existsById("7:" + IMAGE)).thenReturn(true);
    when(storage.getAsset(any())).thenAnswer(call -> {
      AssetFilePath path = call.getArgument(0);
      assertTrue(path.isPrivateFile());
      return path.getFilePath().equals(CSS)
        ? new S3Service.StoredAsset((".secret{background:url('" + source(IMAGE) + "')}").getBytes(StandardCharsets.UTF_8), "text/css")
        : new S3Service.StoredAsset(new byte[] {1, 2, 3}, "image/png");
    });
  }
  String source(String key) { return config.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, key).getS3UriToFile(); }

  @Test void unrelatedWorkspaceAndMalformedKeysCannotReadStorage() {
    for (String key : List.of(IMAGE, "../" + IMAGE)) {
      assertThrows(ResponseStatusException.class, () -> service.read(8L, key));
    }
    verifyNoInteractions(storage);
  }

  @Test void publicationCopiesNestedCssAssetsButStripsBlockedImagesAndAuthoringLookupTables() throws Exception {
    var document = new ObjectMapper().readTree("{\"href\":\"" + source(CSS) + "\",\"proxyUrlMap\":{\"private-url\":\"" + source(IMAGE) + "\"}}");
    var published = service.publish(document, 7L, "demo", 3, Set.of(IMAGE));
    assertFalse(published.has("proxyUrlMap"));
    assertTrue(published.path("href").asText().contains("root/ptour/assets-demo/3/proxy/" + CSS));
    assertEquals(1, uploads.size());
    assertTrue(new String(uploads.values().iterator().next(), StandardCharsets.UTF_8).contains("data:,"));
    assertTrue(document.has("proxyUrlMap"));
    uploads.clear();
    service.publish(document, 7L, "demo", 4);
    assertEquals(2, uploads.size());
    assertTrue(uploads.keySet().stream().allMatch(key -> key.startsWith("root/ptour/assets-demo/4/")));
  }

  @Test void authorizedCrossWorkspaceCopiesCarryNestedAssetAccess() throws Exception {
    service.copyAccess(new ObjectMapper().readTree("{\"href\":\"" + source(CSS) + "\"}"), 7L, 8L);
    verify(access).save(argThat(grant -> grant.getGrantId().equals("8:" + CSS)));
    verify(access).save(argThat(grant -> grant.getGrantId().equals("8:" + IMAGE)));
  }

  @Test void inlineSensitiveImagesAreRemovedEverywhereInThePublishedDocument() throws Exception {
    String image = "data:image/png;base64,c2VjcmV0";
    var document = new ObjectMapper().createObjectNode().put("style", "background:url('" + image + "')");
    var published = service.publish(document, 7L, "demo", 3,
      Set.of(org.apache.commons.codec.digest.DigestUtils.sha256Hex(image)));
    assertEquals("background:url('data:,')", published.path("style").asText());
    assertTrue(document.path("style").asText().contains(image));
    verifyNoInteractions(storage);
  }
}
