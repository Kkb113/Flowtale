package com.sharefable.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "creation_mutation_receipt")
@Getter
@Setter
@NoArgsConstructor
public class CreationMutationReceipt {
  @Id
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(length = 64)
  private String keyHash;
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 64)
  private String requestHash;
  @JdbcTypeCode(SqlTypes.LONGVARCHAR)
  @Column(columnDefinition = "LONGTEXT")
  private String responseJson;
}
