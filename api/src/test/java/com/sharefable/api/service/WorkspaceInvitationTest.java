package com.sharefable.api.service;

import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.entity.WorkspaceInvitation;
import com.sharefable.api.repo.WorkspaceInvitationRepo;
import com.sharefable.api.transport.ExpiryTimeUnit;
import com.sharefable.api.transport.req.ReqNewInvite;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WorkspaceInvitationTest {
  WorkspaceInvitationRepo repository;
  WorkspaceInvitationService service;
  AtomicReference<WorkspaceInvitation> stored;
  User issuer;
  User recipient;

  @BeforeEach void setup() {
    repository = mock(WorkspaceInvitationRepo.class);
    service = new WorkspaceInvitationService(repository);
    stored = new AtomicReference<>();
    when(repository.save(any())).thenAnswer(call -> { stored.set(call.getArgument(0)); return stored.get(); });
    when(repository.findForAcceptance(anyString())).thenAnswer(call -> stored.get() != null
      && stored.get().getTokenHash().equals(call.getArgument(0)) ? Optional.of(stored.get()) : Optional.empty());
    issuer = User.builder().active(true).belongsToOrg(42L).orgs(Set.of(Org.builder().id(42L).build())).build();
    issuer.setId(1L);
    issuer.getOrgs().iterator().next().setCreatedBy(issuer);
    recipient = User.builder().active(true).email("recipient@example.test").orgs(Set.of()).build();
    recipient.setId(2L);
  }

  String issue() {
    return service.issue(new ReqNewInvite(recipient.getEmail(), Optional.of(ExpiryTimeUnit.d), Optional.of(1L)), issuer);
  }

  @Test void tokenIsOpaqueAndOnlyItsHashIsStored() {
    String token = issue();
    assertTrue(token.matches("[A-Za-z0-9_-]{43}"));
    assertNotEquals(token, stored.get().getTokenHash());
    assertEquals(64, stored.get().getTokenHash().length());
    assertEquals(42L, service.accept(token, recipient));
    assertEquals(recipient.getId(), stored.get().getAcceptedBy());
  }

  @Test void legacyUnsignedAndForgedTokensCannotJoin() {
    String token = issue();
    assertThrows(ResponseStatusException.class, () -> service.accept("eyJvcmdJZCI6NDJ9", recipient));
    String changed = (token.startsWith("A") ? "B" : "A") + token.substring(1);
    assertThrows(ResponseStatusException.class, () -> service.accept(changed, recipient));
    assertNull(stored.get().getAcceptedBy());
  }

  @Test void wrongEmailCannotConsumeInvitation() {
    String token = issue();
    recipient.setEmail("attacker@example.test");
    assertThrows(ResponseStatusException.class, () -> service.accept(token, recipient));
    assertNull(stored.get().getAcceptedBy());
  }

  @Test void expiredInvitationCannotJoin() {
    String token = issue();
    stored.get().setExpiresAt(Instant.now().minusSeconds(1));
    assertThrows(ResponseStatusException.class, () -> service.accept(token, recipient));
    assertNull(stored.get().getAcceptedBy());
  }

  @Test void lostResponseCanBeRetriedButRemovedMembershipCannotBeRestored() {
    String token = issue();
    service.accept(token, recipient);
    recipient.setOrgs(issuer.getOrgs());
    assertEquals(42L, service.accept(token, recipient));
    recipient.setOrgs(Set.of());
    assertThrows(ResponseStatusException.class, () -> service.accept(token, recipient));
  }

  @Test void unrelatedWorkspaceAndUnboundedExpiryAreRejected() {
    ReqNewInvite request = new ReqNewInvite(recipient.getEmail(), Optional.of(ExpiryTimeUnit.d), Optional.of(Long.MAX_VALUE));
    assertThrows(ResponseStatusException.class, () -> service.issue(request, issuer));
    issuer.setOrgs(Set.of());
    assertThrows(ResponseStatusException.class, this::issue);
    verify(repository, never()).save(any());
  }
}
