package com.sharefable.api.common;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class AssetFilePathTest {
  @Test
  void buildsAwsUrlWhenNoPublicEndpointIsConfigured() {
    AssetFilePath filePath = AssetFilePath.builder()
      .bucketName("assets")
      .regionName("ap-south-1")
      .fullQualifiedPath("root/srn/demo/index.json")
      .build();

    Assertions.assertEquals(
      "https://assets.s3.ap-south-1.amazonaws.com/root/srn/demo/index.json",
      filePath.getBucketUriToFile()
    );
  }

  @Test
  void buildsPathStyleUrlForALocalPublicEndpoint() {
    AssetFilePath filePath = AssetFilePath.builder()
      .bucketName("assets")
      .regionName("ap-south-1")
      .fullQualifiedPath("/root/srn/demo/index.json")
      .publicEndpoint("http://localhost:4566/")
      .build();

    Assertions.assertEquals(
      "http://localhost:4566/assets/root/srn/demo/index.json",
      filePath.getBucketUriToFile()
    );
  }
}
