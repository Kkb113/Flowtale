package com.sharefable.api.entity;

import com.sharefable.api.common.EntityInfo;
import com.sharefable.api.common.TopLevelEntityType;
import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.Responsiveness;
import com.sharefable.api.transport.TourDeleted;
import com.sharefable.api.transport.TourSettings;
import com.sharefable.api.transport.resp.RespDemoEntityWithSubEntities;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Type;

import java.sql.Timestamp;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "tour")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespDemoEntityWithSubEntities.class)
public class DemoEntity extends EntityBaseWithOwnership {
  @Column(nullable = false)
  private String assetPrefixHash;

  @Column(nullable = false)
  private String displayName;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(nullable = false, name = "created_by")
  private User createdBy;

  private String description;

  private Timestamp lastPublishedDate;

  @Column(nullable = false)
  private Integer publishedVersion;

  @Column(nullable = false)
  private Boolean onboarding;

  private Boolean inProgress;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Map<String, Object> site;

  @Column(nullable = false)
  private Boolean responsive;

  @Enumerated(value = EnumType.STRING)
  @Column(nullable = false)
  private Responsiveness responsive2;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private TourSettings settings;

  @Enumerated(EnumType.ORDINAL)
  @Column(nullable = false)
  private TourDeleted deleted;

  @Enumerated(EnumType.ORDINAL)
  @Column(nullable = false)
  private TopLevelEntityType entityType;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private EntityInfo info;

  private Timestamp lastInteractedAt;

  @ManyToMany(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
  @JoinTable(name = "screens_tours_join", joinColumns = @JoinColumn(name = "tour_id"), inverseJoinColumns = @JoinColumn(name = "screen_id"))
  private Set<Screen> screens;
}
