package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.req.ReqMediaProcessing;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Media jobs can only consume files allocated by this workspace's upload endpoint. */
@Service
@RequiredArgsConstructor
public class MediaSourceValidator {
  private final S3Config config;

  public ReqMediaProcessing validate(ReqMediaProcessing request, User user) {
    if (request == null || user == null || user.getBelongsToOrg() == null || request.getPath() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An uploaded media source is required");
    }
    AssetFilePath prefix = config.getQualifiedPathFor(S3Config.AssetType.UserGenerated,
      user.getBelongsToOrg().toString(), "");
    String bucketPrefix = prefix.getBucketUriToFile();
    String path = request.getPath();
    if (!path.startsWith(bucketPrefix)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Media source not found in this workspace");
    }
    String filename = path.substring(bucketPrefix.length());
    if (!filename.matches("[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}") || filename.contains("..")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid uploaded media filename");
    }
    AssetFilePath asset = config.getQualifiedPathFor(S3Config.AssetType.UserGenerated,
      user.getBelongsToOrg().toString(), filename);
    // CDN and destination locations are configuration, never authority supplied by the caller.
    return new ReqMediaProcessing(asset.getBucketUriToFile(), asset.getS3UriToFile(), request.getAssn());
  }
}
