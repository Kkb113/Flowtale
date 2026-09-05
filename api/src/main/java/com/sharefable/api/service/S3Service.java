package com.sharefable.api.service;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.*;
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
import java.util.ArrayList;
import java.util.List;

@Service
public class S3Service {
  // These reads materialize JSON/image inputs in API memory; media uses the streaming worker.
  static final int MAX_OBJECT_READ_BYTES = 64 * 1024 * 1024;

  private final AmazonS3 client;
  private final AmazonS3 pvtClient;
  private final AmazonS3 presignClient;
  private final AmazonS3 pvtPresignClient;

  @Autowired
  S3Service(AmazonS3 s3, @Qualifier("pvt") AmazonS3 pvtClient,
      @Qualifier("presign") AmazonS3 presignClient, @Qualifier("pvt-presign") AmazonS3 pvtPresignClient) {
    this.client = s3;
    this.pvtClient = pvtClient;
    this.presignClient = presignClient;
    this.pvtPresignClient = pvtPresignClient;
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
    ObjectMetadata metadata = getS3ObjectMetadata(new HashMap<>(assetMetadata));
    metadata.setContentLength(content.length);
    PutObjectRequest req = new PutObjectRequest(
      filePath.getBucketName(),
      filePath.getFullQualifiedPath(),
      new ByteArrayInputStream(content),
      metadata);
    (filePath.isPrivateFile() ? pvtClient : client).putObject(req);

    return filePath;
  }

  public AssetFilePath copy(AssetFilePath fromObject, AssetFilePath toObject, Map<String, String> assetMetadata) {
    CopyObjectRequest req = new CopyObjectRequest(
      fromObject.getBucketName(),
      fromObject.getFullQualifiedPath(),
      toObject.getBucketName(),
      toObject.getFullQualifiedPath());
    if (assetMetadata != null) req.withNewObjectMetadata(getS3ObjectMetadata(new HashMap<>(assetMetadata)));
    (toObject.isPrivateFile() ? pvtClient : client).copyObject(req);
    return toObject;
  }

  public AssetFilePath copy(AssetFilePath fromObject, AssetFilePath toObject) {
    return copy(fromObject, toObject, null);
  }

  /** Enumerates an explicitly resolved object prefix, including every S3 page. */
  public List<String> listKeys(AssetFilePath prefix) {
    String path = prefix.getFullQualifiedPath();
    if (!path.endsWith("/") || path.split("/").length < 3 || path.contains("..")) {
      throw new IllegalArgumentException("An owned asset prefix is required");
    }
    AmazonS3 selected = prefix.isPrivateFile() ? pvtClient : client;
    List<String> keys = new ArrayList<>();
    ListObjectsV2Request request = new ListObjectsV2Request().withBucketName(prefix.getBucketName()).withPrefix(path);
    ListObjectsV2Result page;
    do {
      page = selected.listObjectsV2(request);
      for (S3ObjectSummary object : page.getObjectSummaries()) {
        if (!object.getKey().startsWith(path)) throw new IllegalStateException("Storage returned an unrelated object");
        keys.add(object.getKey());
      }
      if (page.isTruncated() && (page.getNextContinuationToken() == null
          || page.getNextContinuationToken().equals(request.getContinuationToken()))) {
        throw new IllegalStateException("Storage pagination did not advance");
      }
      request.setContinuationToken(page.getNextContinuationToken());
    } while (page.isTruncated());
    return keys;
  }

  public void deletePrefix(AssetFilePath prefix) {
    List<String> keys = listKeys(prefix);
    AmazonS3 selected = prefix.isPrivateFile() ? pvtClient : client;
    for (int start = 0; start < keys.size(); start += 1000) {
      String[] batch = keys.subList(start, Math.min(start + 1000, keys.size())).toArray(String[]::new);
      selected.deleteObjects(new DeleteObjectsRequest(prefix.getBucketName()).withKeys(batch));
    }
    if (!listKeys(prefix).isEmpty()) throw new IllegalStateException("Publication removal could not be verified; retry deletion");
  }

  public URL preSignedUrl(AssetFilePath filePath, String contentType) {
    boolean pvt = filePath.isPrivateFile();
    GeneratePresignedUrlRequest req =
      new GeneratePresignedUrlRequest(filePath.getBucketName(), filePath.getFullQualifiedPath());
    Date expireAt = DateUtils.addMinutes(new Date(), pvt ? 30 : 10);
    req.setExpiration(expireAt);
    req.setMethod(HttpMethod.PUT);
    req.setContentType(contentType);
    return (pvt ? pvtPresignClient : presignClient).generatePresignedUrl(req);
  }

  public byte[] getObjectContent(AssetFilePath filePath) throws IOException {
    return getAsset(filePath).bytes();
  }

  public record StoredAsset(byte[] bytes, String contentType) {}

  public StoredAsset getAsset(AssetFilePath filePath) throws IOException {
    GetObjectRequest req = new GetObjectRequest(
      filePath.getBucketName(),
      filePath.getFullQualifiedPath()
    );
    try (S3Object object = (filePath.isPrivateFile() ? pvtClient : client).getObject(req)) {
      S3ObjectInputStream content = object.getObjectContent();
      if (object.getObjectMetadata().getContentLength() > MAX_OBJECT_READ_BYTES) {
        content.abort();
        throw new IOException("Object exceeds the 64 MiB API input limit");
      }
      try {
        byte[] bytes = content.readNBytes(MAX_OBJECT_READ_BYTES + 1);
        if (bytes.length > MAX_OBJECT_READ_BYTES) {
          throw new IOException("Object exceeds the 64 MiB API input limit");
        }
        String type = object.getObjectMetadata().getContentType();
        return new StoredAsset(bytes, type == null ? "application/octet-stream" : type);
      } catch (IOException | RuntimeException error) {
        content.abort();
        throw error;
      }
    }
  }
}

