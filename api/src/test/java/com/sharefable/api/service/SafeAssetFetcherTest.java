package com.sharefable.api.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.net.InetAddress;
import static org.junit.jupiter.api.Assertions.*;

class SafeAssetFetcherTest {
  @ParameterizedTest
  @ValueSource(strings = {"127.0.0.1", "0.0.0.0", "10.0.0.1", "172.16.0.1", "192.168.0.1",
    "169.254.169.254", "100.64.0.1", "198.18.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1",
    "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1",
    "2001:db8::1", "2002:7f00:1::1", "64:ff9b::7f00:1"})
  void rejectsNonPublicAddresses(String ip) throws Exception {
    assertFalse(SafeAssetFetcher.isPublicAddress(InetAddress.getByName(ip)));
  }

  @ParameterizedTest
  @ValueSource(strings = {"8.8.8.8", "1.1.1.1", "2001:4860:4860::8888", "2606:4700:4700::1111"})
  void permitsPublicAddresses(String ip) throws Exception {
    assertTrue(SafeAssetFetcher.isPublicAddress(InetAddress.getByName(ip)));
  }

  @ParameterizedTest
  @ValueSource(strings = {"file:///etc/passwd", "ftp://example.com/a", "http://user:pass@example.com/a",
    "http://example.com:8080/a", "http://example.com/a#fragment", "//example.com/a"})
  void rejectsUnsafeUrlForms(String url) {
    assertThrows(IllegalArgumentException.class, () -> SafeAssetFetcher.validateUrl(url));
  }
}
