package com.sharefable.api.integration;

import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.UserRepo;
import com.sharefable.api.service.CreationMutationService;
import com.sharefable.api.transport.resp.RespScreen;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class CreationMutationTest extends TestWithRunnerAndSetup {
  @Autowired CreationMutationService mutations;
  @Autowired UserRepo users;
  @Autowired OrgRepo orgs;

  private User owner() {
    String id = UUID.randomUUID().toString();
    User user = users.save(User.builder().email(id + "@example.com").authId(id).active(true)
      .domainBlacklisted(false).firstName("Fixture").orgs(new HashSet<>()).build());
    Org org = orgs.save(Org.builder().rid(id).displayName("Creation workspace")
      .domain("example.com").createdBy(user).build());
    user.getOrgs().add(org);
    user.setBelongsToOrg(org.getId());
    return users.save(user);
  }

  @Test void committedResponseIsReplayedWithoutExpiringUploadCredentials() {
    User user = owner();
    RespScreen original = new RespScreen();
    original.setRid("created-screen");
    original.setUploadUrl(Optional.of("https://example.invalid/expiring-secret"));
    mutations.execute("capture:1", "screen-create", user, Map.of("name", "One"), RespScreen.class, () -> original);
    RespScreen retry = mutations.execute("capture:1", "screen-create", user, Map.of("name", "One"),
      RespScreen.class, () -> { throw new AssertionError("Must not create a second screen"); });
    assertEquals("created-screen", retry.getRid());
    assertTrue(retry.getUploadUrl() == null || retry.getUploadUrl().isEmpty());
  }

  @Test void changedRequestConflictsAndDifferentPrincipalsHaveIndependentKeys() {
    User user = owner();
    mutations.execute("same", "create", user, Map.of("name", "A"), Map.class, () -> Map.of("rid", "first"));
    ResponseStatusException conflict = assertThrows(ResponseStatusException.class, () ->
      mutations.execute("same", "create", user, Map.of("name", "B"), Map.class, () -> Map.of("rid", "wrong")));
    assertEquals(409, conflict.getStatusCode().value());
    assertEquals("second", mutations.execute("same", "create", owner(), Map.of("name", "B"), Map.class,
      () -> Map.of("rid", "second")).get("rid"));
    user.setActive(false);
    assertEquals(403, assertThrows(ResponseStatusException.class, () -> mutations.execute("same", "create", user,
      Map.of("name", "A"), Map.class, () -> Map.of())).getStatusCode().value());
  }

  @Test void failedMutationRollsBackReceiptAndDatabaseChanges() {
    User user = owner();
    assertThrows(IllegalStateException.class, () -> mutations.execute("failed", "create", user, Map.of(), Map.class, () -> {
      Org org = orgs.findById(user.getBelongsToOrg()).orElseThrow();
      org.setDisplayName("Should roll back");
      orgs.save(org);
      throw new IllegalStateException("Upload failed");
    }));
    assertEquals("Creation workspace", orgs.findById(user.getBelongsToOrg()).orElseThrow().getDisplayName());
    assertEquals("recovered", mutations.execute("failed", "create", user, Map.of(), Map.class,
      () -> Map.of("rid", "recovered")).get("rid"));
  }

  @Test void concurrentIdenticalRequestsRunOneMutation() throws Exception {
    User user = owner();
    var executor = Executors.newFixedThreadPool(2);
    var started = new CountDownLatch(1);
    var release = new CountDownLatch(1);
    var attempts = new AtomicInteger();
    try {
      var first = executor.submit(() -> mutations.execute("concurrent", "create", user, Map.of(), Map.class, () -> {
        attempts.incrementAndGet();
        started.countDown();
        try { if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out"); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IllegalStateException(error); }
        return Map.of("rid", "one");
      }));
      assertTrue(started.await(10, TimeUnit.SECONDS));
      var second = executor.submit(() -> mutations.execute("concurrent", "create", user, Map.of(), Map.class, () -> {
        attempts.incrementAndGet();
        return Map.of("rid", "two");
      }));
      release.countDown();
      assertEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
      assertEquals(1, attempts.get());
    } finally {
      release.countDown();
      executor.shutdownNow();
    }
  }
}
