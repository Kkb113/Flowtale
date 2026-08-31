package com.sharefable.api.common;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.util.Optional;

class EditRevisionGuardTest {
  private static final Timestamp CURRENT = new Timestamp(1_700_000_000_123L);

  @Test
  void acceptsMatchingRevision() {
    Assertions.assertDoesNotThrow(() -> EditRevisionGuard.assertCurrent(
      CURRENT,
      Optional.of(CURRENT.getTime())
    ));
  }

  @Test
  void acceptsLegacyRequestWithoutRevision() {
    Assertions.assertDoesNotThrow(() -> EditRevisionGuard.assertCurrent(CURRENT, Optional.empty()));
    Assertions.assertDoesNotThrow(() -> EditRevisionGuard.assertCurrent(CURRENT, null));
  }

  @Test
  void rejectsStaleRevisionWithConflict() {
    ResponseStatusException error = Assertions.assertThrows(
      ResponseStatusException.class,
      () -> EditRevisionGuard.assertCurrent(CURRENT, Optional.of(CURRENT.getTime() - 1))
    );
    Assertions.assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
  }
}
