package com.sharefable.api.controller.v1;

import com.sharefable.api.auth.AuthUser;
import com.sharefable.api.entity.User;
import com.sharefable.api.service.ProxyAssetDelivery;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequiredArgsConstructor
public class ProxyAssetDeliveryController {
  private final ProxyAssetDelivery delivery;

  @GetMapping("/v1/f/proxy-file/{key}")
  public ResponseEntity<byte[]> read(@PathVariable String key, @AuthUser User user) throws IOException {
    var asset = delivery.read(user.getBelongsToOrg(), key);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(asset.contentType()))
      .header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "default-src 'none'; sandbox")
      .body(asset.bytes());
  }
}
