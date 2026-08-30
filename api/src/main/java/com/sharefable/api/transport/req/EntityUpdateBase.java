package com.sharefable.api.transport.req;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.EntityInfo;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.Responsiveness;
import com.sharefable.api.transport.TourSettings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;

import java.sql.Timestamp;
import java.util.Map;
import java.util.Optional;


@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class EntityUpdateBase {
  Optional<Map<String, Object>> site = Optional.empty();

  Optional<Boolean> inProgress = Optional.empty();

  Optional<Boolean> responsive = Optional.empty();

  Optional<Responsiveness> responsive2 = Optional.empty();

  Optional<TourSettings> settings = Optional.empty();

  Optional<EntityInfo> info = Optional.empty();
  Optional<Timestamp> lastInteractedAt = Optional.empty();

}
