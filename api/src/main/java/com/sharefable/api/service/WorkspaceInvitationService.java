package com.sharefable.api.service;

import com.sharefable.api.entity.User;
import com.sharefable.api.entity.WorkspaceInvitation;
import com.sharefable.api.repo.WorkspaceInvitationRepo;
import com.sharefable.api.transport.ExpiryTimeUnit;
import com.sharefable.api.transport.req.ReqNewInvite;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class WorkspaceInvitationService {
  private final WorkspaceInvitationRepo repository;
  private static final SecureRandom RANDOM = new SecureRandom();

  @Transactional
  public String issue(ReqNewInvite request, User user) {
    String email = request.getInvitedEmail() == null ? "" : request.getInvitedEmail().strip().toLowerCase(Locale.ROOT);
    if (email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || user.getBelongsToOrg() == null
        || user.getOrgs() == null || user.getOrgs().stream().noneMatch(org -> Objects.equals(org.getId(), user.getBelongsToOrg()))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid email and workspace membership are required");
    }
    if (!user.hasActiveMembership(user.getBelongsToOrg()) || user.getOrgs().stream().noneMatch(org ->
      Objects.equals(org.getId(), user.getBelongsToOrg()) && org.getCreatedBy() != null
        && Objects.equals(org.getCreatedBy().getId(), user.getId()))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the workspace owner can invite members");
    }
    long amount = request.getExpireAfter() == null ? 1L : request.getExpireAfter().orElse(1L);
    ExpiryTimeUnit unit = request.getExpiryTimeUnit() == null ? ExpiryTimeUnit.d : request.getExpiryTimeUnit().orElse(ExpiryTimeUnit.d);
    long multiplier = unit == ExpiryTimeUnit.d ? 86400L : 3600L;
    if (amount < 1 || amount > 604800L / multiplier) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitations must expire within seven days");
    }
    byte[] entropy = new byte[32];
    RANDOM.nextBytes(entropy);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
    WorkspaceInvitation invitation = new WorkspaceInvitation();
    invitation.setTokenHash(hash(token));
    invitation.setOrgId(user.getBelongsToOrg());
    invitation.setInvitedEmail(email);
    invitation.setExpiresAt(Instant.now().plusSeconds(amount * multiplier));
    repository.save(invitation);
    return token;
  }

  /** Acceptance and membership insertion must commit in the same API transaction. */
  @Transactional(propagation = Propagation.MANDATORY)
  public Long accept(String token, User user) {
    if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalid();
    WorkspaceInvitation invitation = repository.findForAcceptance(hash(token)).orElseThrow(WorkspaceInvitationService::invalid);
    if (!invitation.getInvitedEmail().equalsIgnoreCase(user.getEmail())) throw invalid();
    boolean alreadyMember = user.hasActiveMembership(invitation.getOrgId());
    if (invitation.getAcceptedBy() != null) {
      // A lost response can be retried, but an old invitation cannot restore revoked membership.
      if (Objects.equals(invitation.getAcceptedBy(), user.getId()) && alreadyMember) return invitation.getOrgId();
      throw invalid();
    }
    if (!invitation.getExpiresAt().isAfter(Instant.now())) throw invalid();
    invitation.setAcceptedBy(user.getId());
    repository.save(invitation);
    return invitation.getOrgId();
  }

  private static ResponseStatusException invalid() {
    return new ResponseStatusException(HttpStatus.FORBIDDEN,
      "This invitation is invalid, expired, or belongs to another email. Ask the workspace owner for a new invitation.");
  }

  private static String hash(String token) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
    catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
  }
}
