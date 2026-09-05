package com.sharefable.api.service;

import com.sharefable.api.entity.User;
import com.sharefable.api.repo.UserRepo;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserAuthenticationTest {
  @Test void loginCannotReactivateDisabledAccountOrChangeItsWorkspace() {
    UserRepo repo = mock(UserRepo.class);
    SubscriptionService subscriptions = mock(SubscriptionService.class);
    NfHookService notifications = mock(NfHookService.class);
    UserService service = new UserService(repo, notifications, subscriptions);
    User disabled = User.builder().email("disabled@example.test").authId("fixture-subject").active(false).build();
    when(repo.findUserByEmail(disabled.getEmail())).thenReturn(Optional.of(disabled));
    Jwt jwt = Jwt.withTokenValue("fixture-token").header("alg", "RS256").subject("fixture-subject")
      .claim("https://identity.sharefable.com/user", Map.of("email", disabled.getEmail())).build();
    ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.getOrCreateUserFromJwt(jwt));
    assertEquals(403, error.getStatusCode().value());
    assertFalse(disabled.getActive());
    verify(repo, never()).save(any());
    verifyNoInteractions(subscriptions, notifications);
  }
}
