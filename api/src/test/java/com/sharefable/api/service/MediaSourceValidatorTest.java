package com.sharefable.api.service;

import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.User;
import com.sharefable.api.transport.req.ReqMediaProcessing;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class MediaSourceValidatorTest {
  private final User user = User.builder().belongsToOrg(42L).build();
  private final S3Config config = new S3Config();

  private MediaSourceValidator validator() {
    config.setRootQualifier("root");
    config.setAssetBucketName("assets");
    config.setRegion("ap-south-1");
    config.setCdn("cdn.example.com");
    return new MediaSourceValidator(config);
  }

  @Test void acceptsOwnedUploadsAndDerivesCdnFromConfiguration() {
    var request = validator().validate(new ReqMediaProcessing(
      "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/file.webm", "https://evil.example.com", null), user);
    assertEquals("https://cdn.example.com/root/usr/org/42/file.webm", request.getCdnPath());
  }

  @Test void supportsExplicitLocalStorage() {
    var validator = validator();
    config.setPublicEndpoint("http://localhost:14566");
    assertDoesNotThrow(() -> validator.validate(new ReqMediaProcessing(
      "http://localhost:14566/assets/root/usr/org/42/file", null, null), user));
  }

  @ParameterizedTest
  @ValueSource(strings = {
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/421/file",
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/../43/file",
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/%2e%2e%2f43/file",
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/file?token=secret",
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/file#fragment",
    "https://assets.s3.ap-south-1.amazonaws.com/root/usr/org/42/nested/file",
    "https://assets.s3.ap-south-1.amazonaws.com/root/srn/42/file",
    "https://attacker.example.com/root/usr/org/42/file"
  })
  void rejectsForeignOrAmbiguousSources(String path) {
    assertThrows(ResponseStatusException.class, () -> validator().validate(new ReqMediaProcessing(path, null, null), user));
  }
}
