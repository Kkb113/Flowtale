package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.resp.RespProxyAsset;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "asset_proxy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@SuperBuilder(toBuilder = true)
@TransportObjRef(cls = RespProxyAsset.class)
public class ProxyAsset extends EntityBaseWithReadableId {
  @Column(nullable = false)
  private String fullOriginUrl;

  private String proxyUri;

  @Column(nullable = false)
  private Integer httpStatus;
}
