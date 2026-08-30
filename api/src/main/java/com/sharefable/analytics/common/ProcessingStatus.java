package com.sharefable.analytics.common;

import com.sharefable.api.transport.GenerateTSDef;

@GenerateTSDef
public enum ProcessingStatus {
  Waiting,
  InProgress,
  Successful,
  Failed
}
