package com.sharefable.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "proxy_asset_access")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ProxyAssetAccess {
  @Id @Column(length = 80)
  private String grantId;
}
