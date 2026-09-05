package com.sharefable.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.UnauthorizedReason;
import com.sharefable.api.common.Utils;
import com.sharefable.api.config.OrgContext;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.UserRepo;
import com.sharefable.api.transport.NfEvents;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.javatuples.Pair;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@Qualifier("userService")
@RequiredArgsConstructor
public class UserService {
  private final UserRepo userRepo;
  private final NfHookService nfHookService;
  private final SubscriptionService subService;

  ObjectMapper objectMapper = new ObjectMapper();

  // used from AuthUser annotation
  public User getOrCreateUserFromJwt(Jwt jwt) throws JsonProcessingException {
    UserClaimFromAuth0 userClaimFromAuth0 = getUserClaimsFromAuth0(jwt);
    String subject = jwt.getSubject();
    User user = userRepo.findUserByEmail(userClaimFromAuth0.email())
      .orElseGet(() -> createNewUser(userClaimFromAuth0, subject));

    if (!StringUtils.equalsIgnoreCase(user.getAuthId(), subject)) {
      // If user has logged in using one auth provider (google) and tries to login using another login
      // provider (email<>password) ask user to login using existing auth
      log.warn("Authentication identity does not match the existing account");
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, objectMapper.writeValueAsString(
        Map.of("r", UnauthorizedReason.EmailIdExistsButLoginMethodDoesNotMatch)
      ));
    }

    if (!Boolean.TRUE.equals(user.getActive())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is disabled. Contact your workspace administrator.");
    }
    return setLatestOrgForUser(user, OrgContext.getCurrentOrgId());
  }

  public UserClaimFromAuth0 getUserClaimsFromAuth0(Jwt jwt) throws JsonProcessingException {
    Map<String, Object> claims = jwt.getClaims();
    Object userDetailsClaim = claims.get("https://identity.sharefable.com/user");
    String userDetailsClaimStr = objectMapper.writeValueAsString(userDetailsClaim);
    return objectMapper.readValue(userDetailsClaimStr, UserClaimFromAuth0.class);
  }

  public User createNewUser(UserClaimFromAuth0 user, String authId) {
    Pair<String, Boolean> domainInf = Utils.getDomainFromEmailForRespectiveEmail(user.email());
    String emailDomain = domainInf.getValue0();
    Boolean isWorkEmail = domainInf.getValue1();

    if (StringUtils.isBlank(emailDomain)) {
      log.error("Can't find domain from email {}", user.email());
      throw new IllegalStateException("Can't create user");
    }

    User newUser = User.builder()
      .email(user.email())
      .avatar(user.picture())
      .authId(authId)
      .firstName(StringUtils.substring(user.givenName, 0, 49))
      .lastName(StringUtils.substring(user.familyName, 0, 49))
      .domainBlacklisted(!isWorkEmail)
      .active(true)
      .build();
    sendUserNf(user.email(), newUser.getFirstName(), newUser.getLastName());
    return userRepo.save(newUser);
  }

  public void sendUserNf(String userEmail, String firstName, String lastName) {
    Map<String, String> eventInfo = new HashMap<>();

    if (StringUtils.isBlank(userEmail) || StringUtils.isBlank(firstName)) {
      log.warn("Didn't send message as one of userEmail=[{}] or firstName=[{}] is blank", userEmail, firstName);
      return;
    }

    eventInfo.put("emailId", userEmail);
    eventInfo.put("firstName", firstName);
    if (!StringUtils.isBlank(lastName)) eventInfo.put("lastName", lastName);
    nfHookService.sendNotification(NfEvents.NEW_USER_SIGNUP, eventInfo);
  }

  public void sendUserNf(String userEmail, String params) {
    Map<String, String> eventInfo = new HashMap<>();

    if (StringUtils.isBlank(userEmail)) {
      log.warn("Didn't send message as one of userEmail=[{}] or details=[{}]", userEmail, params);
      return;
    }

    eventInfo.put("emailId", userEmail);
    eventInfo.put("params", params);
    nfHookService.sendNotification(NfEvents.NEW_USER_SIGNUP, eventInfo);
  }


  public User setLatestOrgForUser(User user, Long orgId) throws JsonProcessingException {
    // A remembered workspace is a preference, never proof of current membership.
    if (orgId == null && user.getBelongsToOrg() != null
      && !user.hasActiveMembership(user.getBelongsToOrg())) {
      user.setBelongsToOrg(null);
    }
    if (orgId != null) {
      Set<Org> orgs = user.getOrgs();
      orgs = orgs == null ? Set.of() : orgs;
      boolean isOrgValid = false;
      for (Org org : orgs) {
        if (Objects.equals(org.getId(), orgId) && user.hasActiveMembership(orgId)) {
          user.setBelongsToOrg(orgId);
          isOrgValid = true;
          break;
        }
      }
      if (!isOrgValid) {
        log.warn("Requested workspace membership could not be verified");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, objectMapper.writeValueAsString(
          Map.of("r", UnauthorizedReason.OrgSuggestedButInvalidAssociation)
        ));
      }
    }
    return user;
  }

  public record UserClaimFromAuth0(String picture, String email, String familyName, String givenName) {
  }
}
