package com.sharefable.api.transport.req;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;

@GenerateTSDef
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
public class ReqUpdateSubInfo {
  private Optional<Boolean> soloPlanDowngradeIntentReceived;
}
