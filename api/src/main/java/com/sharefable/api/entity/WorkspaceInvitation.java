package com.sharefable.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "workspace_invitation")
@Getter
@Setter
@NoArgsConstructor
public class WorkspaceInvitation {
  @Id
  @Column(length = 64, nullable = false)
  private String tokenHash;
  @Column(nullable = false)
  private Long orgId;
  @Column(nullable = false, length = 254)
  private String invitedEmail;
  @Column(nullable = false)
  private Instant expiresAt;
  private Long acceptedBy;
}
