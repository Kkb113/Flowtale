package com.sharefable.api.transport.req;

import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.GenerateTSDef;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@GenerateTSDef
@Slf4j
public record ReqNewDataset(String name, Optional<String> description) {
  public ReqNewDataset normalizeDisplayName() {
    return new ReqNewDataset(isValidDatasetName(Utils.normalizeWhitespace(name()).toLowerCase()), description());
  }

  public String isValidDatasetName(String name) {
    if (!(name.length() <= 60 && name.matches("^[a-zA-Z0-9_]+$"))) {
      log.error("The Dataset name is not valid {}", name);
      throw new ResponseStatusException(HttpStatus.NOT_ACCEPTABLE, "The Dataset name is not valid");
    }
    return name;
  }
}
