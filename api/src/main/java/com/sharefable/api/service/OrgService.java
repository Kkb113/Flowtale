package com.sharefable.api.service;

import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.OrgRepo;
import com.sharefable.api.transport.resp.RespUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrgService {
  private final OrgRepo orgRepo;

  public List<RespUser> getAllUsersInAnOrg(Long orgId) {
    Optional<Org> maybeOrg = orgRepo.findById(orgId);
    if (maybeOrg.isEmpty()) return new ArrayList<>();
    Org org = maybeOrg.get();
    Set<User> users = org.getUsers();
    return users.stream().map(RespUser::from).collect(Collectors.toList());
  }

  public User getOrgOwner(Long orgId) {
    Optional<Org> maybeOrg = orgRepo.findById(orgId);
    if (maybeOrg.isEmpty()) return null;
    Org org = maybeOrg.get();
    Set<User> users = org.getUsers();
    return users.stream().findFirst().orElse(null);
  }

  public int getCountOfActiveUsersInOrg(Long orgId) {
    List<RespUser> allUsersInAnOrg = getAllUsersInAnOrg(orgId);
    // Filter out user who are not active and discard fable support emails
    return (int) allUsersInAnOrg.stream().filter(
      user -> user.getActive() && !(
        StringUtils.startsWithIgnoreCase(user.getEmail(), "fablesupport@")
          || StringUtils.startsWithIgnoreCase(user.getEmail(), "support@sharefable.com")
      )
    ).count();
  }
}
