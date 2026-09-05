package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.resp.RespUser;
import jakarta.persistence.*;
import lombok.*;

import java.util.Set;
import java.util.HashSet;
import java.util.Objects;

@Entity
@Table(name = "user")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@TransportObjRef(cls = RespUser.class)
public class User extends EntityBase {
  private String authId;

  private String firstName;

  private String lastName;

  @Column(nullable = false)
  private String email;

  private String avatar;

  private Boolean domainBlacklisted;

  private Long belongsToOrg;

  @Column(nullable = false)
  private Boolean active = true;

  @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
  @JoinTable(
    name = "user_org_join",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "org_id"))
  private Set<Org> orgs;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "user_workspace_disabled", joinColumns = @JoinColumn(name = "user_id"),
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "org_id"}))
  @Column(name = "org_id", nullable = false)
  @Builder.Default
  @ToString.Exclude
  private Set<Long> disabledOrgIds = new HashSet<>();

  public boolean hasActiveMembership(Long orgId) {
    return Boolean.TRUE.equals(active) && orgId != null && orgs != null
      && orgs.stream().anyMatch(org -> Objects.equals(org.getId(), orgId))
      && (disabledOrgIds == null || !disabledOrgIds.contains(orgId));
  }
}
