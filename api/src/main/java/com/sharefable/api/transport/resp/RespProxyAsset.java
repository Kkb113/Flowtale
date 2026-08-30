package com.sharefable.api.transport.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.Utils;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.ProxyAsset;
import com.sharefable.api.transport.GenerateTSDef;
import io.sentry.Sentry;
import lombok.*;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.InvocationTargetException;
import java.util.Optional;

@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Slf4j
@JsonInclude(JsonInclude.Include.NON_NULL)
@GenerateTSDef
public class RespProxyAsset extends ResponseBase {
    private String proxyUri;
    private Optional<String> content;
    private Optional<Boolean> hasErr;

    public static RespProxyAsset from(ProxyAsset asset, S3Config pathConfig) {
        try {
            RespProxyAsset resp = (RespProxyAsset) Utils.fromEntityToTransportObject(asset);
            AssetFilePath filePath = pathConfig.getQualifiedPathFor(S3Config.AssetType.ProxyAsset, asset.getProxyUri());
            resp.setProxyUri(filePath.getS3UriToFile());
            return resp;
        } catch (InstantiationException | IllegalAccessException | NoSuchMethodException |
                 InvocationTargetException e) {
            log.error("Can't convert entity to transport object. Error: " + e.getMessage());
            Sentry.captureException(e);
            return Empty();
        }
    }

    public static RespProxyAsset from(String absUrl) {
        RespProxyAsset resp = Empty();
        resp.setProxyUri(absUrl);
        return resp;
    }

    public static RespProxyAsset Empty() {
        return new RespProxyAsset();
    }

    public static RespProxyAsset WithError(String originalUrl) {
        RespProxyAsset proxyAsset = new RespProxyAsset();
        proxyAsset.setProxyUri(originalUrl);
        proxyAsset.setHasErr(Optional.of(true));
        return proxyAsset;
    }
}
