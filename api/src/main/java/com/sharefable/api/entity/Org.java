package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.OrgInfo;
import com.sharefable.api.transport.resp.RespOrg;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Type;

import java.util.Set;

@Entity
@Table(name = "org")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespOrg.class)
public class Org extends EntityBaseWithReadableId {
  @Column(nullable = false)
  private String displayName;

  private String thumbnail;

  @Column(nullable = false)
  private String domain;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(nullable = false, name = "created_by")
  private User createdBy;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private OrgInfo info;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
    name = "user_org_join",
    joinColumns = @JoinColumn(name = "org_id"),
    inverseJoinColumns = @JoinColumn(name = "user_id"))
  @OrderBy("createdAt ASC")
  private Set<User> users;
}
