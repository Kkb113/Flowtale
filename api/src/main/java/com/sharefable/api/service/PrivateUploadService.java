package com.sharefable.api.service;

import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.PvtAssetType;
import com.sharefable.api.transport.resp.RespUploadUrl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class PrivateUploadService {
  private final S3Config config;
  private final S3Service storage;

  public RespUploadUrl create(User user, String contentType, String sessionId, String filename, PvtAssetType type) {
    Long orgId = user.getBelongsToOrg();
    if (!user.hasActiveMembership(orgId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Select a workspace before uploading capture assets");
    }
    if (sessionId == null || !sessionId.matches("[A-Za-z0-9_-]{8,128}")
      || filename == null || !filename.matches("[A-Za-z0-9][A-Za-z0-9_.-]{0,191}") || filename.contains("..") || type == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capture identifiers and filenames must be valid path segments");
    }
    boolean validType = type == PvtAssetType.TourInputData ? "application/json".equals(contentType)
      : Set.of("image/png", "image/jpeg", "image/webp", "image/gif").contains(contentType == null ? "" : contentType);
    if (!validType) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported capture asset content type");
    AssetFilePath path = config.getQualifiedPathFor(type == PvtAssetType.TourInputData
      ? S3Config.AssetType.PvtTourInputData : S3Config.AssetType.PvtTourLlmOpsAssets,
      "org/" + orgId + "/" + sessionId, filename);
    return RespUploadUrl.builder().url(storage.preSignedUrl(path, contentType).toString())
      .filename(filename).objectKey(path.getFullQualifiedPath()).expiry("default").build();
  }
}
