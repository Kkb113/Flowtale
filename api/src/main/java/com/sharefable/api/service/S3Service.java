package com.sharefable.api.service;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.*;
import com.amazonaws.util.IOUtils;
import com.sharefable.api.common.AssetFilePath;
import org.apache.commons.lang3.time.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URL;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class S3Service {

  private final AmazonS3 client;
  private final AmazonS3 pvtClient;

  @Autowired
  S3Service(AmazonS3 s3, @Qualifier("pvt") AmazonS3 pvtClient) {
    this.client = s3;
    this.pvtClient = pvtClient;
  }

  private ObjectMetadata getS3ObjectMetadata(HashMap<String, String> assetMetadata) {
    ObjectMetadata meta = new ObjectMetadata();
    String contentType;
    if ((contentType = assetMetadata.get(HttpHeaders.CONTENT_TYPE)) != null) {
      meta.setContentType(contentType);
      assetMetadata.remove(HttpHeaders.CONTENT_TYPE);
    }
    String contentEncoding;
    if ((contentEncoding = assetMetadata.get(HttpHeaders.CONTENT_ENCODING)) != null) {
      meta.setContentEncoding(contentEncoding);
      assetMetadata.remove(HttpHeaders.CONTENT_ENCODING);
    }

    String cacheControl;
    if ((cacheControl = assetMetadata.get(HttpHeaders.CACHE_CONTROL)) != null) {
      meta.setCacheControl(cacheControl);
      assetMetadata.remove(HttpHeaders.CACHE_CONTROL);
    }


    for (Map.Entry<String, String> metadata : assetMetadata.entrySet()) {
      meta.addUserMetadata(metadata.getKey(), metadata.getValue());
    }

    return meta;
  }

  public AssetFilePath upload(AssetFilePath filePath, byte[] content, Map<String, String> assetMetadata) {
    PutObjectRequest req = new PutObjectRequest(
      filePath.getBucketName(),
      filePath.getFullQualifiedPath(),
      new ByteArrayInputStream(content),
      getS3ObjectMetadata(new HashMap<>(assetMetadata)));
    client.putObject(req);

    return filePath;
  }

  public AssetFilePath copy(AssetFilePath fromObject, AssetFilePath toObject, Map<String, String> assetMetadata) {
    CopyObjectRequest req = new CopyObjectRequest(
      fromObject.getBucketName(),
      fromObject.getFullQualifiedPath(),
      toObject.getBucketName(),
      toObject.getFullQualifiedPath());
    if (assetMetadata != null) req.withNewObjectMetadata(getS3ObjectMetadata(new HashMap<>(assetMetadata)));
    client.copyObject(req);
    return toObject;
  }

  public AssetFilePath copy(AssetFilePath fromObject, AssetFilePath toObject) {
    return copy(fromObject, toObject, null);
  }

  public URL preSignedUrl(AssetFilePath filePath, String contentType) {
    boolean pvt = filePath.isPrivateFile();
    GeneratePresignedUrlRequest req =
      new GeneratePresignedUrlRequest(filePath.getBucketName(), filePath.getFullQualifiedPath());
    Date expireAt = DateUtils.addMinutes(new Date(), pvt ? 30 : 10);
    req.setExpiration(expireAt);
    req.setMethod(HttpMethod.PUT);
    req.setContentType(contentType);
    return (pvt ? pvtClient : client).generatePresignedUrl(req);
  }

  public byte[] getObjectContent(AssetFilePath filePath) throws IOException {
    GetObjectRequest req = new GetObjectRequest(
      filePath.getBucketName(),
      filePath.getFullQualifiedPath()
    );
    S3Object object = client.getObject(req);
    S3ObjectInputStream content = object.getObjectContent();
    byte[] fileAsBytes = IOUtils.toByteArray(content);
    content.close();
    return fileAsBytes;
  }
}

