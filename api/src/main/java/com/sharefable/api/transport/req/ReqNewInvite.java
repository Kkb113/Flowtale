package com.sharefable.api.transport.req;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.ExpiryTimeUnit;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class ReqNewInvite {
  private String invitedEmail;
  private Optional<ExpiryTimeUnit> expiryTimeUnit = Optional.of(ExpiryTimeUnit.d);
  private Optional<Long> expireAfter = Optional.of(1L);
}
