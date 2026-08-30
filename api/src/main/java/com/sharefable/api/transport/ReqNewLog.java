package com.sharefable.api.transport;

import com.sharefable.api.common.ForObjectType;
import com.sharefable.api.common.LogType;

import java.util.Optional;

@GenerateTSDef
public record ReqNewLog(
  Long orgId,
  LogType logType,
  ForObjectType forObjectType,
  Long forObjectId,
  Optional<String> forObjectKey,
  Object logLine
) {
}
