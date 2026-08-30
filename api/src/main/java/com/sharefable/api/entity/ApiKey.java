package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.resp.RespApiKey;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "api_key")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespApiKey.class)
public class ApiKey extends EntityBase {
  @Column(nullable = false)
  private String apiKey;

  @Column(nullable = false)
  private Boolean active;

  @ManyToOne
  @JoinColumn(name = "created_by_id")
  private User createdBy;

  @ManyToOne
  @JoinColumn(name = "org_id")
  private Org org;
}
