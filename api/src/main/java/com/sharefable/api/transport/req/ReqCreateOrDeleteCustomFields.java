package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;

import java.util.Set;

@GenerateTSDef
public record ReqCreateOrDeleteCustomFields(Set<String> customFields) {
}
