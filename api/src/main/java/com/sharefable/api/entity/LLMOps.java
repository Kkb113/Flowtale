package com.sharefable.api.entity;

import com.sharefable.api.common.LLMOpsStatus;
import com.sharefable.api.transport.GenerateTSDef;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

@Entity
@Table(name = "llm_ops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@GenerateTSDef
public class LLMOps extends EntityBase {
  private Long orgId;

  private Long entityId;

  private String threadId;

  @Enumerated(value = EnumType.STRING)
  @Column(nullable = false)
  private LLMOpsStatus status;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Object data;

  @Type(JsonType.class)
  @Column(columnDefinition = "json")
  private Object meta;
}
