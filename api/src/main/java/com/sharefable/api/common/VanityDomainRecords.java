package com.sharefable.api.common;

public record VanityDomainRecords(
  DomainRecordType recordType,
  String recordDes,
  String recordKey,
  String recordValue
) {
}
