package com.sharefable.api.transport.vendor;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Optional;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
@Slf4j
@GenerateTSDef
public class LinkedApps {
  private String name;
  private String icon;
  private String description;
  private String type;
  @JsonProperty("app_id")
  private String appId;
  @JsonProperty("auth_type")
  private String authType;
  private List<String> tags;
  private Optional<LinkedAppVersion> version;
  private Optional<Boolean> connected;
  @JsonProperty("connected_accounts")
  private Optional<List<Object>> connectedAccounts;
  @JsonProperty("auth_input_map")
  private Optional<List<AuthInputMap>> authInputMap;
  private String slug;
  @JsonProperty("reauth_required")
  private Boolean reAuthRequired;
}
