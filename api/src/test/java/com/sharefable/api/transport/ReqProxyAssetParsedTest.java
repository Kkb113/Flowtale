package com.sharefable.api.transport;

import com.sharefable.api.transport.req.ReqProxyAsset;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@SuppressWarnings("removal")
class ReqProxyAssetParsedTest {
    private ParsedReqProxyAsset credentialedRequest() {
        String metadata = java.util.Base64.getEncoder().encodeToString(
            "{\"kie\":\"session=secret\",\"ua\":\"browser\"}".getBytes(StandardCharsets.UTF_8));
        return ParsedReqProxyAsset.from(new ReqProxyAsset("https://assets.example.com/a.css", metadata, Optional.empty()))
            .orElseThrow();
    }

    @Test
    void keepsCredentialsOnlyForTheSameOrigin() {
        ParsedReqProxyAsset source = credentialedRequest();
        Assertions.assertEquals("session=secret", source.updateUrl("/nested.css").orElseThrow().getCookie());
        for (String url : new String[]{"https://other.example.com/a", "http://assets.example.com/a",
            "https://assets.example.com:8443/a"}) {
            ParsedReqProxyAsset redirected = source.updateUrl(url).orElseThrow();
            Assertions.assertEquals("", redirected.getCookie());
            Assertions.assertEquals("", redirected.getClientInfo());
        }
    }

    @Test
    void rejectsMalformedEncodedMetadataWithoutThrowingOrEchoingSecrets() {
        Assertions.assertTrue(ParsedReqProxyAsset.from(new ReqProxyAsset(
            "https://example.com/a", "invalid%%%", Optional.empty())).isEmpty());
    }

    @Test
    void validProxyAssetReqParsing() {
        ReqProxyAsset req = new ReqProxyAsset();
        req.setOrigin("https://fonts.googleapis.com/css?family=Google+Sans:300,400,500,700,800,900");

        String clientInfo = "{ \"kie\": \"\", \"ua\": \"moz\" }";
        String encodedInfo = org.springframework.util.Base64Utils.encodeToString(clientInfo.getBytes(StandardCharsets.UTF_8));
        req.setClientInfo(encodedInfo);

        Optional<ParsedReqProxyAsset> parsed = ParsedReqProxyAsset.from(req);
        Assertions.assertTrue(parsed.isPresent());
        Assertions.assertInstanceOf(URL.class, parsed.get().getOriginParsed());
        Assertions.assertEquals("", parsed.get().getCookie());
        Assertions.assertEquals("moz", parsed.get().getUserAgent());
    }
}
