package com.sharefable.api.entity;

import com.sharefable.api.common.PlatformIntegrationType;
import com.sharefable.api.common.TransportObjRef;
import com.sharefable.api.transport.resp.RespPlatformIntegration;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.Map;

@Entity
@Table(name = "platform_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@TransportObjRef(cls = RespPlatformIntegration.class)
public class PlatformIntegration extends EntityBase {
  @Enumerated(value = EnumType.STRING)
  @Column(nullable = false)
  private PlatformIntegrationType type;
  private String name;
  private String icon;
  private String description;
  private Boolean disabled;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Map<String, Object> platformConfig;
}
