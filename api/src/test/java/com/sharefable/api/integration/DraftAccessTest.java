package com.sharefable.api.integration;

import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.entity.DemoEntity;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.Screen;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.DemoEntityRepo;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.repo.ScreenRepo;
import com.sharefable.api.repo.UserRepo;
import com.sharefable.api.service.EntityService;
import com.sharefable.api.transport.Responsiveness;
import com.sharefable.api.transport.ScreenType;
import com.sharefable.api.transport.TourDeleted;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestPropertySource(properties = "com.sharefable.api.internal-service-token=test-only-service-secret-with-at-least-32-bytes")
class DraftAccessTest extends TestWithRunnerAndSetup {
  private static final String SECRET = "test-only-service-secret-with-at-least-32-bytes";
  @Autowired UserRepo users;
  @Autowired OrgRepo orgs;
  @Autowired DemoEntityRepo demos;
  @Autowired ScreenRepo screens;
  @Autowired EntityService entities;

  private User owner() {
    String id = UUID.randomUUID().toString();
    User user = users.save(User.builder().email(id + "@example.com").authId(id).active(true)
      .domainBlacklisted(false).firstName("Fixture").orgs(new HashSet<>()).build());
    Org org = orgs.save(Org.builder().rid(UUID.randomUUID().toString()).displayName("Fixture workspace")
      .domain("example.com").createdBy(user).build());
    user.getOrgs().add(org);
    user.setBelongsToOrg(org.getId());
    return users.save(user);
  }

  private DemoEntity demo(User user, TopLevelEntityType type, TourDeleted deleted) {
    return demos.save(DemoEntity.builder().rid(UUID.randomUUID().toString()).assetPrefixHash("private-draft")
      .displayName("Private draft").createdBy(user).belongsToOrg(user.getBelongsToOrg()).publishedVersion(0)
      .onboarding(false).inProgress(false).responsive(false).responsive2(Responsiveness.NoChoice)
      .deleted(deleted).entityType(type).screens(Set.of()).build());
  }

  private Screen screen(User user) {
    return screens.save(Screen.builder().rid(UUID.randomUUID().toString()).assetPrefixHash("private-screen")
      .displayName("Private screen").createdBy(user).belongsToOrg(user.getBelongsToOrg())
      .parentScreenId(0L).url("https://example.com/").responsive(false).type(ScreenType.SerDom).build());
  }

  private RequestPostProcessor as(User user) {
    return jwt().jwt(token -> token.subject(user.getAuthId()).claim("email_verified", true)
      .claim("https://identity.sharefable.com/user", Map.of("email", user.getEmail(), "picture", "",
        "givenName", "Fixture", "familyName", "User")));
  }

  @ParameterizedTest
  @ValueSource(strings = {"tour", "screen", "dh"})
  void draftRoutesRequireUserAuthenticationAndOldPublicRoutesAreGone(String kind) throws Exception {
    mvc.perform(get("/v1/f/draft/" + (kind.equals("dh") ? "hub" : kind) + "/private/index.json"))
      .andExpect(status().isUnauthorized());
    mvc.perform(get("/v1/f/" + kind).param("rid", "private")) .andExpect(status().isUnauthorized());
    mvc.perform(get("/v1/f/" + kind).param("rid", "private").header("X-Fable-Service-Token", SECRET))
      .andExpect(status().isUnauthorized());
    mvc.perform(get("/v1/" + kind).param("rid", "private")).andExpect(status().isNotFound());
  }

  @Test void onlyTheOwningWorkspaceCanReadDraftsAndScreens() throws Exception {
    User owner = owner();
    User outsider = owner();
    var tour = demo(owner, TopLevelEntityType.TOUR, TourDeleted.ACTIVE);
    var hub = demo(owner, TopLevelEntityType.DEMO_HUB, TourDeleted.ACTIVE);
    var screen = screen(owner);
    for (var resource : Map.of("tour", tour.getRid(), "dh", hub.getRid(), "screen", screen.getRid()).entrySet()) {
      String path = "/v1/f/" + resource.getKey();
      mvc.perform(get(path).param("rid", resource.getValue()).with(as(owner)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.rid").value(resource.getValue()))
        .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
      mvc.perform(get(path).param("rid", resource.getValue()).with(as(outsider))).andExpect(status().isNotFound());
      mvc.perform(get(path).param("rid", "missing").with(as(owner))).andExpect(status().isNotFound());
    }
    mvc.perform(get("/v1/f/tour").param("rid", tour.getRid()).param("s", "true").with(as(owner)))
      .andExpect(status().isOk()).andExpect(jsonPath("$.data.screens").isArray());
    mvc.perform(get("/v1/f/tour").param("rid", hub.getRid()).with(as(owner))).andExpect(status().isNotFound());
    mvc.perform(get("/v1/f/dh").param("rid", tour.getRid()).with(as(owner))).andExpect(status().isNotFound());
    var deleted = demo(owner, TopLevelEntityType.TOUR, TourDeleted.DELETED);
    mvc.perform(get("/v1/f/tour").param("rid", deleted.getRid()).param("_i", "true").with(as(owner)))
      .andExpect(status().isNotFound());
  }

  @Test void workerReadRequiresItsServiceCredential() throws Exception {
    User owner = owner();
    var tour = demo(owner, TopLevelEntityType.TOUR, TourDeleted.ACTIVE);
    String path = "/v1/tour/by/rid/" + tour.getRid();
    mvc.perform(get(path)).andExpect(status().isUnauthorized());
    mvc.perform(get(path).with(as(owner))).andExpect(status().isUnauthorized());
    mvc.perform(get(path).header("X-Fable-Service-Token", "incorrect")).andExpect(status().isUnauthorized());
    mvc.perform(get(path).header("X-Fable-Service-Token", SECRET))
      .andExpect(status().isOk()).andExpect(jsonPath("$.data.rid").value(tour.getRid()));
  }

  @Test void copyingAScreenChecksBothSourceAndDestinationBeforeCopyingAssets() throws Exception {
    User owner = owner();
    User outsider = owner();
    var ownTour = demo(owner, TopLevelEntityType.TOUR, TourDeleted.ACTIVE);
    var foreignTour = demo(outsider, TopLevelEntityType.TOUR, TourDeleted.ACTIVE);
    var ownScreen = screen(owner);
    var foreignScreen = screen(outsider);
    for (var copy : List.of(Map.of("parentId", foreignScreen.getId(), "tourRid", ownTour.getRid()),
        Map.of("parentId", ownScreen.getId(), "tourRid", foreignTour.getRid()))) {
      mvc.perform(post("/v1/f/copyscreen").with(as(owner)).contentType("application/json").content(mapToJson(copy)))
        .andExpect(status().isUnauthorized());
    }
    var hub = demo(owner, TopLevelEntityType.DEMO_HUB, TourDeleted.ACTIVE);
    mvc.perform(post("/v1/f/copyscreen").with(as(owner)).contentType("application/json")
      .content(mapToJson(Map.of("parentId", ownScreen.getId(), "tourRid", hub.getRid()))))
      .andExpect(status().isNotFound());
  }

  @Test void publicationRejectsMissingPlanAndWrongEntityTypeBeforeTouchingAssets() {
    User owner = owner();
    var tour = demo(owner, TopLevelEntityType.TOUR, TourDeleted.ACTIVE);
    var hub = demo(owner, TopLevelEntityType.DEMO_HUB, TourDeleted.ACTIVE);
    for (var entity : List.of(tour, hub)) {
      var error = assertThrows(ResponseStatusException.class,
        () -> entities.publishEntity(entity.getRid(), owner, null, entity.getEntityType()));
      assertEquals(409, error.getStatusCode().value());
      assertTrue(error.getReason().contains("plan setup"));
      var saved = demos.findById(entity.getId()).orElseThrow();
      assertEquals(0, saved.getPublishedVersion());
      assertNull(saved.getLastPublishedDate());
    }
    var wrongType = assertThrows(ResponseStatusException.class,
      () -> entities.publishEntity(hub.getRid(), owner, null, TopLevelEntityType.TOUR));
    assertEquals(404, wrongType.getStatusCode().value());
  }

  @Test void renameCannotChangeAnEntityThroughTheWrongProductRoute() {
    User owner = owner();
    var hub = demo(owner, TopLevelEntityType.DEMO_HUB, TourDeleted.ACTIVE);
    var request = new com.sharefable.api.transport.req.ReqRenameGeneric("Unexpected rename",
      java.util.Optional.empty(), hub.getRid());
    var error = assertThrows(ResponseStatusException.class,
      () -> entities.renameEntity(request, owner, TopLevelEntityType.TOUR));
    assertEquals(404, error.getStatusCode().value());
    assertEquals("Private draft", demos.findById(hub.getId()).orElseThrow().getDisplayName());
    assertEquals(hub.getRid(), demos.findById(hub.getId()).orElseThrow().getRid());
  }
}
