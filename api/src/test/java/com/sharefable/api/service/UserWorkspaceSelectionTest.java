package com.sharefable.api.service;

import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.UserRepo;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserWorkspaceSelectionTest {
  private final UserService service = new UserService(mock(UserRepo.class), mock(NfHookService.class), mock(SubscriptionService.class));

  @Test void staleRememberedWorkspaceDoesNotConferAccess() throws Exception {
    User user = User.builder().active(true).belongsToOrg(7L).orgs(Set.of()).build();
    assertNull(service.setLatestOrgForUser(user, null).getBelongsToOrg());
    assertThrows(ResponseStatusException.class, () -> service.setLatestOrgForUser(user, 7L));
  }

  @Test void preservesValidSelectionAndAllowsSwitchingOnlyToCurrentMemberships() throws Exception {
    User user = User.builder().active(true).belongsToOrg(7L).orgs(Set.of(Org.builder().id(7L).build(), Org.builder().id(8L).build())).build();
    assertEquals(7L, service.setLatestOrgForUser(user, null).getBelongsToOrg());
    assertEquals(8L, service.setLatestOrgForUser(user, 8L).getBelongsToOrg());
    assertThrows(ResponseStatusException.class, () -> service.setLatestOrgForUser(user, 9L));
    assertEquals(8L, user.getBelongsToOrg());
  }
}
