package com.sharefable.api.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.Optional;

public final class EditRevisionGuard {
  private EditRevisionGuard() {
  }

  public static void assertCurrent(Timestamp currentRevision, Optional<Long> expectedRevision) {
    if (expectedRevision == null || expectedRevision.isEmpty()) {
      return;
    }
    if (currentRevision == null || currentRevision.getTime() != expectedRevision.get()) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "This demo changed after the editor loaded. Reload before applying this edit."
      );
    }
  }
}
