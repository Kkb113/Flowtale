package com.sharefable.api.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssetFilePath {
  String cdn;
  String regionName;
  String bucketName;
  // Full path to the file without the bucket name; like root/srn/0/data/index.json
  String fullQualifiedPath;
  // Prefix path to the file based on asset type; like for screen root/srn/0
  String prefixPathForType;
  // File path after the prefix path data/index.json
  String filePath;
  boolean privateFile = false;

  public static AssetFilePath from(AssetFilePath halfConstructedPath, String qualifiedPath) {
    return new AssetFilePath(
      halfConstructedPath.cdn,
      halfConstructedPath.regionName,
      halfConstructedPath.bucketName,
      qualifiedPath,
      "",
      "",
      halfConstructedPath.privateFile
    );
  }

  public static AssetFilePath from(AssetFilePath assetFilePath) {
    return new AssetFilePath(
      assetFilePath.cdn,
      assetFilePath.regionName,
      assetFilePath.bucketName,
      assetFilePath.fullQualifiedPath,
      assetFilePath.prefixPathForType,
      assetFilePath.filePath,
      assetFilePath.isPrivateFile()
    );
  }

  public String getBucketUriToFile() {
    return "https://" + bucketName + ".s3." + regionName + ".amazonaws.com/" + fullQualifiedPath;
  }

  public String getS3UriToFile() {
    // For production systems this is served via cdn, otherwise s3 directly
    if (StringUtils.isBlank(cdn)) {
      return getBucketUriToFile();
    }
    return "https://" + cdn + "/" + fullQualifiedPath;
  }
}
