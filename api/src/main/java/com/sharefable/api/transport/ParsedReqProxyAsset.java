package com.sharefable.api.transport;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.req.ReqProxyAsset;
import io.sentry.Sentry;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.HashMap;
import java.util.Optional;

@Data
@EqualsAndHashCode(callSuper = true)
@Slf4j
public class ParsedReqProxyAsset extends ReqProxyAsset {
    private static final ObjectMapper om = new ObjectMapper();

    private URL originParsed;
    private String cookie;
    private String userAgent;

    private ParsedReqProxyAsset() {
    }

    @SuppressWarnings("removal")
    public static Optional<ParsedReqProxyAsset> from(ReqProxyAsset req) {
        ParsedReqProxyAsset parsedReq = new ParsedReqProxyAsset();
        parsedReq.setOrigin(req.getOrigin());
        parsedReq.setClientInfo(req.getClientInfo());
        parsedReq.setBody(Optional.of(req.getBody().orElse(false)));
        try {
            URL originParsed = new URL(req.getOrigin());
            parsedReq.setOriginParsed(originParsed);
        } catch (MalformedURLException e) {
            log.error("Could not parse url because of error {}", e.getMessage());
            Sentry.captureException(e);
            return Optional.empty();
        }

        byte[] bytes = org.springframework.util.Base64Utils.decodeFromString(req.getClientInfo());
        String clientInfoStr = new String(bytes);
        TypeReference<HashMap<String, String>> typeRef = new TypeReference<>() {
        };
        try {
            HashMap<String, String> map = om.readValue(clientInfoStr, typeRef);
            parsedReq.setCookie(map.get("kie"));
            parsedReq.setUserAgent(map.get("ua"));
        } catch (JsonProcessingException e) {
            log.error("Could not parse clientInfo from body. {}", e.getMessage());
            Sentry.captureException(e);
            return Optional.empty();
        }

        if (parsedReq.cookie == null || parsedReq.userAgent == null) {
            log.error("Either cookie or useragent is null while parsing the proxy asset body");
            return Optional.empty();
        }

        return Optional.of(parsedReq);
    }

    public Optional<ParsedReqProxyAsset> updateUrl(String assetUrl) {
        try {
            URL originParsed = Utils.convertRelativeUrlToAbsoluteUrlIfRequired(assetUrl, this.originParsed);
            ParsedReqProxyAsset parsedReq = new ParsedReqProxyAsset();
            parsedReq.setOriginParsed(originParsed);
            parsedReq.setCookie(this.getCookie());
            parsedReq.setUserAgent(this.getUserAgent());
            parsedReq.setOrigin(originParsed.toString());
            parsedReq.setClientInfo(this.getClientInfo());
            parsedReq.setBody(this.getBody());
            return Optional.of(parsedReq);
        } catch (MalformedURLException | URISyntaxException e) {
            log.error("Could not parse url because of error {}", e.getMessage());
            Sentry.captureException(e);
            return Optional.empty();
        }
    }
}
