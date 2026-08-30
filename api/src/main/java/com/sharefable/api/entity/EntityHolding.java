package com.sharefable.api.entity;


import com.sharefable.api.transport.EntityHoldingInfoBase;
import com.sharefable.api.transport.EntityType;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

@Entity
@Table(name = "entity_holding")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
public class EntityHolding extends EntityBase {
    @Enumerated(value = EnumType.ORDINAL)
    @Column(nullable = false)
    private EntityType entityType;

    private Long entityKey;

    private String assetKey;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private EntityHoldingInfoBase info;
}
