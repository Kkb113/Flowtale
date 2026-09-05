package com.sharefable.api.transport;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.Utils;
import com.sharefable.api.transport.req.ReqProxyAsset;
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
        if (req == null) return Optional.empty();
        ParsedReqProxyAsset parsedReq = new ParsedReqProxyAsset();
        parsedReq.setOrigin(req.getOrigin());
        parsedReq.setClientInfo(req.getClientInfo());
        parsedReq.setBody(Optional.of(req.getBody() != null && req.getBody().orElse(false)));
        try {
            URL originParsed = new URL(req.getOrigin());
            parsedReq.setOriginParsed(originParsed);
        } catch (MalformedURLException | NullPointerException e) {
            log.warn("Invalid asset URL");
            return Optional.empty();
        }

        TypeReference<HashMap<String, String>> typeRef = new TypeReference<>() {
        };
        try {
            if (req.getClientInfo() == null || req.getClientInfo().length() > 32768) return Optional.empty();
            byte[] bytes = org.springframework.util.Base64Utils.decodeFromString(req.getClientInfo());
            String clientInfoStr = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            HashMap<String, String> map = om.readValue(clientInfoStr, typeRef);
            if (map == null) return Optional.empty();
            parsedReq.setCookie(map.get("kie"));
            parsedReq.setUserAgent(map.get("ua"));
        } catch (JsonProcessingException | IllegalArgumentException e) {
            log.warn("Invalid asset client metadata");
            return Optional.empty();
        }

        if (parsedReq.cookie == null || parsedReq.userAgent == null
            || parsedReq.cookie.contains("\r") || parsedReq.cookie.contains("\n")
            || parsedReq.userAgent.contains("\r") || parsedReq.userAgent.contains("\n")) {
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
            boolean sameOrigin = originParsed.getProtocol().equalsIgnoreCase(this.originParsed.getProtocol())
                && originParsed.getHost().equalsIgnoreCase(this.originParsed.getHost())
                && effectivePort(originParsed) == effectivePort(this.originParsed);
            parsedReq.setCookie(sameOrigin ? this.getCookie() : "");
            parsedReq.setUserAgent(this.getUserAgent());
            parsedReq.setOrigin(originParsed.toString());
            // Do not retain an encoded copy of credentials after an origin change.
            parsedReq.setClientInfo(sameOrigin ? this.getClientInfo() : "");
            parsedReq.setBody(this.getBody());
            return Optional.of(parsedReq);
        } catch (MalformedURLException | URISyntaxException e) {
            log.warn("Invalid nested asset URL");
            return Optional.empty();
        }
    }

    private static int effectivePort(URL url) {
        return url.getPort() == -1 ? url.getDefaultPort() : url.getPort();
    }
}
