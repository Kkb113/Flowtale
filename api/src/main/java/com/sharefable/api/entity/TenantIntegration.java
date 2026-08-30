package com.sharefable.api.entity;

import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.resp.RespTenantIntegration;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.Map;

@Entity
@Table(name = "tenant_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@TransportObjRef(cls = RespTenantIntegration.class)
public class TenantIntegration extends EntityBase {
  private Long orgId;
  private Boolean disabled;
  private Long integrationId;
  private String event;
  private Long tourId;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Map<String, Object> tenantConfig;
}
