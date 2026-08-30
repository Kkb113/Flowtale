package com.sharefable.api.transport;

import com.sharefable.api.transport.req.ReqProxyAsset;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@SuppressWarnings("removal")
class ReqProxyAssetParsedTest {
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
