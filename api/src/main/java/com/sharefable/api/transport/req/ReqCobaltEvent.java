package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;

import java.util.Map;

@GenerateTSDef
public record ReqCobaltEvent(String event, Map<String, Object> payload) {
}
