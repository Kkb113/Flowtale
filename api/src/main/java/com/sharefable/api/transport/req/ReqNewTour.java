package com.sharefable.api.transport.req;

import com.sharefable.api.common.EntityInfo;
import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.TourSettings;

import java.util.Optional;

@GenerateTSDef
public record ReqNewTour(String name, Optional<String> description, Optional<TourSettings> settings,
                         Optional<EntityInfo> info) {
  public ReqNewTour normalizeDisplayName() {
    return new ReqNewTour(Utils.normalizeWhitespace(name()), description(), settings(), info());
  }
}
