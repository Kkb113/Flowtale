package com.sharefable.api.common;

public enum EntityConfigConfigType {
  VANITY_DOMAIN,
  CUSTOM_FORM_FIELDS,
  GLOBAL_OPTS,
  AI_CREDIT,
  DATASET,

  // This key is reserved for running experiments. Client will set this key and retrieves this key via a generic endpoint
  _EXP_
}
