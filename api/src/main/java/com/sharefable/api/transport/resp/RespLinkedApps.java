package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@SuperBuilder(toBuilder = true)
@GenerateTSDef
public class RespLinkedApps {
  private String name;
  private String icon;
  private String description;
  private String type;
  private Optional<Boolean> connected;
  private String slug;
}
