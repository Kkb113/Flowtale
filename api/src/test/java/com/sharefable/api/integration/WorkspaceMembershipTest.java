package com.sharefable.api.integration;

import com.sharefable.Routes;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.UserRepo;
import com.sharefable.api.service.SubscriptionService;
import com.sharefable.api.service.WorkspaceInvitationService;
import com.sharefable.api.service.WorkspaceService;
import com.sharefable.api.transport.req.ReqAssignOrgToUser;
import com.sharefable.api.transport.req.ReqNewInvite;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;

import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkspaceMembershipTest extends TestWithRunnerAndSetup {
  @Autowired UserRepo users;
  @Autowired OrgRepo orgs;
  @Autowired WorkspaceService workspaces;
  @Autowired WorkspaceInvitationService invitations;
  @MockBean SubscriptionService subscriptions;

  private User user() {
    String id = UUID.randomUUID().toString();
    return users.save(User.builder().email(id + "@example.com").authId(id).firstName("Fixture")
      .active(true).domainBlacklisted(false).orgs(new HashSet<>()).build());
  }

  private Org workspace(User owner) {
    Org org = orgs.save(Org.builder().rid(UUID.randomUUID().toString()).displayName("Fixture workspace")
      .domain("example.com").createdBy(owner).build());
    owner.getOrgs().add(org);
    users.save(owner);
    return org;
  }

  private String invitation(User owner, Org org, User recipient) {
    owner.setBelongsToOrg(org.getId());
    ReqNewInvite request = new ReqNewInvite();
    request.setInvitedEmail(recipient.getEmail());
    return invitations.issue(request, owner);
  }

  private int assign(User user, Long orgId, String token, boolean verified) throws Exception {
    Map<String, Object> body = token == null ? Map.of("orgId", orgId) : Map.of("orgId", orgId, "inviteCode", token);
    return mvc.perform(post(Routes.API_V1 + Routes.ASSIGN_ORG_TO_USER)
      .with(jwt().jwt(jwt -> jwt.subject(user.getAuthId()).claim("email_verified", verified)
        .claim("https://identity.sharefable.com/user", Map.of("email", user.getEmail(),
          "picture", "", "givenName", "Fixture", "familyName", "User"))))
      .contentType(MediaType.APPLICATION_JSON).content(mapToJson(body))).andReturn().getResponse().getStatus();
  }

  @Test void joiningRequiresAValidInvitationAndVerifiedRecipient() throws Exception {
    User owner = user();
    Org org = workspace(owner);
    User recipient = user();
    String token = invitation(owner, org, recipient);
    mvc.perform(post(Routes.API_V1 + Routes.ASSIGN_ORG_TO_USER).contentType(MediaType.APPLICATION_JSON)
      .content(mapToJson(Map.of("orgId", org.getId())))).andExpect(status().isUnauthorized());
    assertEquals(403, assign(recipient, org.getId(), null, true));
    assertEquals(403, assign(recipient, org.getId(), "x".repeat(43), true));
    assertEquals(403, assign(recipient, org.getId(), token, false));
    assertTrue(users.findById(recipient.getId()).orElseThrow().getOrgs().isEmpty());
    assertEquals(200, assign(recipient, org.getId(), token, true));
    assertEquals(200, assign(recipient, org.getId(), token, true));
    assertEquals(200, assign(recipient, org.getId(), null, true));
    assertEquals(1, users.findById(recipient.getId()).orElseThrow().getOrgs().size());
  }

  @Test void sharingAnEmailDomainCannotDiscoverOrJoinAWorkspace() throws Exception {
    workspace(user());
    User recipient = user();
    var identity = jwt().jwt(jwt -> jwt.subject(recipient.getAuthId()).claim("email_verified", true)
      .claim("https://identity.sharefable.com/user", Map.of("email", recipient.getEmail(),
        "picture", "", "givenName", "Fixture", "familyName", "User")));
    mvc.perform(post(Routes.API_V1 + Routes.ASSIGN_IMPLICIT_USER_ORG).with(identity))
      .andExpect(status().isGone());
    mvc.perform(get(Routes.API_V1 + Routes.GET_ORG).param("if", "1").with(identity))
      .andExpect(status().isGone());
    assertTrue(users.findById(recipient.getId()).orElseThrow().getOrgs().isEmpty());
  }

  @Test void deactivationIsScopedAndCannotBeBypassedByInvitationRetry() throws Exception {
    User owner = user();
    Org first = workspace(owner);
    Org second = workspace(owner);
    User recipient = user();
    String firstToken = invitation(owner, first, recipient);
    assertEquals(200, assign(recipient, first.getId(), firstToken, true));
    assertEquals(200, assign(recipient, second.getId(), invitation(owner, second, recipient), true));
    owner.setBelongsToOrg(first.getId());
    assertFalse(workspaces.activateOrDeactivateUser(recipient.getId(), false, owner).getActive());
    User changed = users.findById(recipient.getId()).orElseThrow();
    assertTrue(changed.getActive());
    assertFalse(changed.hasActiveMembership(first.getId()));
    assertTrue(changed.hasActiveMembership(second.getId()));
    assertEquals(403, assign(recipient, first.getId(), firstToken, true));
    assertEquals(403, assign(recipient, first.getId(), null, true));
    assertEquals(200, assign(recipient, second.getId(), null, true));
    assertEquals(Set.of(second.getId()), workspaces.getAllOrgForUser(changed).stream().map(value -> value.getId()).collect(Collectors.toSet()));
    assertTrue(workspaces.activateOrDeactivateUser(recipient.getId(), true, owner).getActive());
    assertEquals(200, assign(recipient, first.getId(), null, true));
  }

  @Test void restoringALegacyInactiveAccountDoesNotRestoreOtherWorkspaces() {
    User owner = user();
    Org first = workspace(owner);
    Org second = workspace(owner);
    User recipient = user();
    recipient.setOrgs(new HashSet<>(Set.of(first, second)));
    recipient.setActive(false);
    users.save(recipient);
    owner.setBelongsToOrg(first.getId());
    workspaces.activateOrDeactivateUser(recipient.getId(), true, owner);
    User changed = users.findById(recipient.getId()).orElseThrow();
    assertTrue(changed.hasActiveMembership(first.getId()));
    assertFalse(changed.hasActiveMembership(second.getId()));
  }

  @Test void membersCannotAdministerAccessOrInvitationsAndOwnersCannotDisableThemselves() throws Exception {
    User owner = user();
    Org org = workspace(owner);
    User recipient = user();
    assertEquals(200, assign(recipient, org.getId(), invitation(owner, org, recipient), true));
    User member = users.findById(recipient.getId()).orElseThrow();
    member.setBelongsToOrg(org.getId());
    assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> workspaces.activateOrDeactivateUser(owner.getId(), false, member));
    assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> invitations.issue(new ReqNewInvite("another@example.com", Optional.empty(), Optional.empty()), member));
    assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> workspaces.activateOrDeactivateUser(owner.getId(), false, owner));
    assertThrows(org.springframework.web.server.ResponseStatusException.class,
      () -> workspaces.activateOrDeactivateUser(user().getId(), false, owner));
  }

  @Test void simultaneousInvitationsPreserveBothMemberships() throws Exception {
    User owner = user();
    Org first = workspace(owner);
    Org second = workspace(owner);
    User recipient = user();
    String firstToken = invitation(owner, first, recipient);
    String secondToken = invitation(owner, second, recipient);
    User staleFirst = users.findById(recipient.getId()).orElseThrow();
    User staleSecond = users.findById(recipient.getId()).orElseThrow();
    CountDownLatch start = new CountDownLatch(1);
    var executor = Executors.newFixedThreadPool(2);
    try {
      var one = executor.submit(() -> {
        start.await();
        return workspaces.assignOrgToUser(new ReqAssignOrgToUser(first.getId(), Optional.of(firstToken)), staleFirst);
      });
      var two = executor.submit(() -> {
        start.await();
        return workspaces.assignOrgToUser(new ReqAssignOrgToUser(second.getId(), Optional.of(secondToken)), staleSecond);
      });
      start.countDown();
      one.get(30, TimeUnit.SECONDS);
      two.get(30, TimeUnit.SECONDS);
      Set<Long> memberships = users.findById(recipient.getId()).orElseThrow().getOrgs().stream()
        .map(Org::getId).collect(Collectors.toSet());
      assertEquals(Set.of(first.getId(), second.getId()), memberships);
    } finally {
      executor.shutdownNow();
      assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
    }
  }
}
