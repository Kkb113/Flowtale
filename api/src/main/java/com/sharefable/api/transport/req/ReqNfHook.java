package com.sharefable.api.transport.req;

import com.sharefable.api.transport.GenerateTSDef;
import com.sharefable.api.transport.NfEvents;

import java.util.Map;

@GenerateTSDef
public record ReqNfHook(NfEvents eventName, Map<String, String> payload) {
}
