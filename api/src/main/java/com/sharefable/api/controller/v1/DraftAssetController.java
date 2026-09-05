package com.sharefable.api.controller.v1;

import com.sharefable.Routes;
import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.DraftAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping(Routes.API_V1)
public class DraftAssetController {
  private final DraftAssetService assets;

  @GetMapping(Routes.DRAFT_ASSET)
  public ResponseEntity<byte[]> read(@PathVariable String kind, @PathVariable String rid,
      @PathVariable String filename, @AuthUser User user) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore())
      .contentType(filename.equals("index.img") ? MediaType.APPLICATION_OCTET_STREAM : MediaType.APPLICATION_JSON)
      .header("X-Content-Type-Options", "nosniff").body(assets.read(kind, rid, filename, user));
  }
}
