package com.sharefable.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@MappedSuperclass
@Getter
@Setter
@ToString
@NoArgsConstructor
@SuperBuilder(toBuilder = true)
public abstract class EntityBaseWithOwnership extends EntityBaseWithReadableId {
    @Column(nullable = false)
    public Long belongsToOrg;
}
