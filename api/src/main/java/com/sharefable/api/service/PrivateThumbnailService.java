package com.sharefable.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sharefable.api.common.ImageThumbnail;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.ScreenRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/** Small draft thumbnails are response-only data, authorized independently of caller-supplied references. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrivateThumbnailService {
  private final ScreenRepo screens;
  private final OrgRepo orgs;
  private final S3Service storage;
  private final S3Config config;

  @Transactional(readOnly = true)
  public void project(JsonNode response, Long org) {
    if (org != null) project(response, org, new HashMap<>());
  }

  private void project(JsonNode node, Long org, Map<String, String> resolved) {
    if (node instanceof ObjectNode object) {
      // Never echo a supplied rendering derivative as though it had been authorized.
      object.remove("thumbnailData");
      String reference = object.path("thumbnail").asText("");
      if (reference.matches("[A-Za-z0-9_-]{1,100}(\\.[A-Za-z0-9]{1,8})?")) {
        String data = resolved.computeIfAbsent(reference, key -> read(key, org));
        if (!data.isEmpty()) object.put("thumbnailData", data);
      }
    }
    for (JsonNode child : node) if (child.isContainerNode()) project(child, org, resolved);
  }

  private String read(String reference, Long org) {
    if (!screens.existsByThumbnailAndBelongsToOrg(reference, org) && !orgs.existsByIdAndThumbnail(org, reference)) return "";
    try {
      byte[] bytes = storage.getObjectContent(config.getQualifiedPathFor(S3Config.AssetType.Common, reference));
      return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(ImageThumbnail.create(bytes, 360, 240));
    } catch (Exception error) {
      // A thumbnail outage must not turn a successful durable save into a failed acknowledgement.
      log.warn("Private thumbnail unavailable for workspace {} ({})", org, error.getClass().getSimpleName());
      return "";
    }
  }
}
