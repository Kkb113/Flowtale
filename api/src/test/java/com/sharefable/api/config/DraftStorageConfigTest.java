package com.sharefable.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class DraftStorageConfigTest {
  @Test void draftDocumentsArePrivateButPublicationSnapshotsKeepTheirPublicNamespace() {
    S3Config config = new S3Config();
    config.setAssetBucketName("public");
    config.setPvtAssetBucketName("private");
    config.setRootQualifier("root");
    AppConfig app = new AppConfig();
    app.setActiveProfile("local");
    ReflectionTestUtils.setField(config, "appConfig", app);
    for (S3Config.AssetType type : new S3Config.AssetType[] { S3Config.AssetType.Tour,
        S3Config.AssetType.Screen, S3Config.AssetType.DemoHub }) {
      var file = config.getQualifiedPathFor(type, "id", "index.json");
      assertTrue(file.isPrivateFile());
      assertEquals("private", file.getBucketName());
      assertTrue(file.getFullQualifiedPath().startsWith("local/root/"));
    }
    var snapshot = config.getQualifiedPathFor(S3Config.AssetType.PublishedTour, "assets-demo", "2/screens/screen/index.json");
    assertTrue(config.getQualifiedPathFor(S3Config.AssetType.Screen, "screen", "index.img").isPrivateFile());
    assertFalse(snapshot.isPrivateFile());
    assertEquals("root/ptour/assets-demo/2/screens/screen/index.json", snapshot.getFullQualifiedPath());
    assertFalse(config.getQualifiedPathFor(S3Config.AssetType.Tour, "demo", "2_index.json").isPrivateFile());
  }
}
