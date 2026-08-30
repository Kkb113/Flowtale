package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.ScreenType;
import com.sharefable.api.transport.resp.RespScreen;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.Set;

@Entity
@Table(name = "screen")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespScreen.class)
public class Screen extends EntityBaseWithOwnership {
  @Column(nullable = false)
  private String assetPrefixHash;

  @Column(nullable = false)
  private String displayName;

  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(nullable = false, name = "created_by")
  private User createdBy;

  private String thumbnail;

  @Column(nullable = false)
  private Long parentScreenId;

  @Column(nullable = false)
  private String url;

  private String icon;

  @Column(nullable = false)
  private Boolean responsive;

  // Read: com.sharefable.api.transport.ScreenType doc
  @Enumerated(value = EnumType.ORDINAL)
  @Column(nullable = false)
  private ScreenType type;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
    name = "screens_tours_join",
    joinColumns = @JoinColumn(name = "screen_id"),
    inverseJoinColumns = @JoinColumn(name = "tour_id"))
  private Set<DemoEntity> demoEntities;
}
