package com.sharefable.api.config;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.sharefable.api.common.AssetFilePath;
import com.sharefable.api.common.VersionedFile;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@ConfigurationProperties(prefix = "com.sharefable.api.s3")
@NoArgsConstructor
@AllArgsConstructor
@Data
@Slf4j
public class S3Config {
  private static final String TOUR_DATA_FILE_NAME = "index.json";
  private static final String SCREEN_DATA_FILE_NAME = "index.json";
  private static final String DEMOHUB_DATA_FILE_NAME = "index.json";
  private static final String EDIT_FILE_NAME = "edits.json";
  private static final String LOADER_FILE_NAME = "loader.json";
  private static final String DATASET_FILE_NAME = "%d_%s.json";
  private static final String IMAGE_FILE_NAME = "index.img";
  private static final String LEAD_ACTIVITY_FILE_NAME = "ule.json";
  private static final String PUBLISHED_DATA_FILE_NAME = "%d_index.json";
  private static final String PUBLISHED_EDIT_FILE_NAME = "%d_edits.json";
  private static final String PUBLISHED_LOADER_FILE_NAME = "%d_loader.json";
  private static final String PUBLISHED_TOUR_ENTITY_FILE_NAME = "0_d_data.json";
  private static final String MANIFEST_FILE = "manifest.json";
  private static final String PATH_FOR_COMMON_ASSET = "/cmn";
  private static final String PATH_FOR_PROXY_ASSET = "/proxy_asset";
  private static final String PATH_FOR_PUBLISHED_TOUR_ASSET = "/ptour/%s";
  private static final String PATH_FOR_PUBLISHED_DEMO_HUB_ASSET = "/pdh/%s";
  private static final String PATH_FOR_SCREEN_ASSET = "/srn/%s";
  private static final String PATH_FOR_TOUR_ASSET = "/tour/%s";
  private static final String PATH_FOR_USER_UPLOADED_ASSET = "/usr/org/%s";
  private static final String PATH_FOR_LEAD_LEVEL_ANALYTICS = "/ula/%s";
  private static final String PATH_FOR_DEMOHUB_ASSET = "/dh/%s";
  private static final String PATH_FOR_PVT_TOUR_INPUT = "/tour_data/%s/ip";
  private static final String PATH_FOR_PVT_LLM_OPS = "/tour_data/%s/llmops";
  private static final String PATH_FOR_DATASET = "/orgpub/%s/ds";
  private String region;
  private String rootQualifier;
  private String assetBucketName;
  private String pvtAssetBucketName;
  private String pvtAssetBucketRegion;
  private String cdn;

  @Autowired
  private AppConfig appConfig;

  public static EntityFilesConfig getEntityFiles() {
    return new EntityFilesConfig(
      new FileConfig(TOUR_DATA_FILE_NAME, DATA_FILE_CACHE_POLICY.NoCache), // don't cache preview route's tour datafile
      new FileConfig(SCREEN_DATA_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache), // always cache screen datafile
      new FileConfig(EDIT_FILE_NAME, DATA_FILE_CACHE_POLICY.NoCache), // don't cache preview route's edit file
      new FileConfig(LOADER_FILE_NAME, DATA_FILE_CACHE_POLICY.NoCache), // don't cache preview route's loader file
      new FileConfig(IMAGE_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache), // always cache image file
      new FileConfig(PUBLISHED_DATA_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache, String::format), // always cache published tour datafile
      new FileConfig(PUBLISHED_EDIT_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache, String::format), // always cache published edit file
      new FileConfig(PUBLISHED_LOADER_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache, String::format), // always cache published loader file
      new FileConfig(PUBLISHED_TOUR_ENTITY_FILE_NAME, DATA_FILE_CACHE_POLICY.StaleOk), // cache with revalidate tour entity file
      new FileConfig(MANIFEST_FILE, DATA_FILE_CACHE_POLICY.NoCache),
      new FileConfig(LEAD_ACTIVITY_FILE_NAME, DATA_FILE_CACHE_POLICY.NoCache),
      new FileConfig(DEMOHUB_DATA_FILE_NAME, DATA_FILE_CACHE_POLICY.NoCache),
      // INFO [#dataset_caching] works in a weird way -
      //      The live (non published) dataset file is named as 0_{dataset_name} >> need to be cached as NoCache
      //      The published dataset file is named as {n}_{dataset_name} where n is the published version >>need to be cached as Cache
      // WARN Here we are making dataset's cache policy is Cached. And when template file gets created below, we are overriding the
      //      cache policy. This is just a workaround so that we don't test the rest of the system.
      //      In a nutshell, all dataset cache policy is set as Cached. While template file gets created for dataset the cache
      //      policy is overwritten as NoCache. For published dataset cache policy remains Cache
      new FileConfig(DATASET_FILE_NAME, DATA_FILE_CACHE_POLICY.Cache, String::format));
  }

  public static String getCachePolicyStr(DATA_FILE_CACHE_POLICY policy) {
    return switch (policy) {
      case NoCache -> "max-age=0";
      case StaleOk -> "max-age=60, stale-while-revalidate=120";
      case Cache -> "max-age=2592000, stale-while-revalidate=60";
    };
  }

  private String getPathForAssetType(AssetType type) {
    return switch (type) {
      case ProxyAsset -> PATH_FOR_PROXY_ASSET;
      case Tour -> PATH_FOR_TOUR_ASSET;
      case Screen -> PATH_FOR_SCREEN_ASSET;
      case Common -> PATH_FOR_COMMON_ASSET;
      case PublishedTour -> PATH_FOR_PUBLISHED_TOUR_ASSET;
      case UserGenerated -> PATH_FOR_USER_UPLOADED_ASSET;
      case Analytics -> PATH_FOR_LEAD_LEVEL_ANALYTICS;
      case DemoHub -> PATH_FOR_DEMOHUB_ASSET;
      case PublishedDemoHub -> PATH_FOR_PUBLISHED_DEMO_HUB_ASSET;
      case PvtTourInputData -> PATH_FOR_PVT_TOUR_INPUT;
      case PvtTourLlmOpsAssets -> PATH_FOR_PVT_LLM_OPS;
      case Dataset -> PATH_FOR_DATASET;
    };
  }

  public AssetFilePath getQualifiedPathFor(AssetType type, String filePath) {
    return getQualifiedPathFor(type, "0", filePath);
  }

  public PathConfigForClient getPathConfigForClient() {
    AssetFilePath assetFilePath = getAssetFilePathWithCommonProps();
    return new PathConfigForClient(
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.Common, "") + "/").getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.Screen, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.Tour, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.PublishedTour, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.Analytics, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.DemoHub, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.PublishedDemoHub, "")).getS3UriToFile(),
      AssetFilePath.from(assetFilePath, getPrefixPath(AssetType.Dataset, "")).getS3UriToFile()

    );
  }

  private String getPrefixPath(AssetType type, String prefix, boolean addEnvQualifier) {
    String path = getPathForAssetType(type);

    String pathWithoutEnvQualifier = rootQualifier + String.format(path, prefix);
    if (addEnvQualifier) {
      return appConfig.getActiveProfile().toLowerCase() + "/" + pathWithoutEnvQualifier;
    }
    return pathWithoutEnvQualifier;
  }

  private String getPrefixPath(AssetType type, String prefix) {
    return getPrefixPath(type, prefix, false);
  }

  private AssetFilePath getAssetFilePathWithCommonProps() {
    AssetFilePath assetFilePath = new AssetFilePath();
    assetFilePath.setBucketName(assetBucketName);
    assetFilePath.setRegionName(region);
    assetFilePath.setCdn(cdn);
    return assetFilePath;
  }

  private AssetFilePath getPrivateAssetFilePathWithCommonProps() {
    AssetFilePath assetFilePath = new AssetFilePath();
    assetFilePath.setBucketName(pvtAssetBucketName);
    assetFilePath.setRegionName(pvtAssetBucketRegion);
    assetFilePath.setPrivateFile(true);
    return assetFilePath;
  }

  public AssetFilePath getQualifiedPathFor(AssetType type, String prefix, String filePath) {
    AssetFilePath assetFilePath = switch (type) {
      case PvtTourInputData, PvtTourLlmOpsAssets -> getPrivateAssetFilePathWithCommonProps();
      default -> getAssetFilePathWithCommonProps();
    };
    String prefixPath = getPrefixPath(type, prefix, assetFilePath.isPrivateFile());
    assetFilePath.setPrefixPathForType(prefixPath);
    assetFilePath.setFilePath(filePath);
    assetFilePath.setFullQualifiedPath(prefixPath + StringUtils.prependIfMissing(filePath, "/"));
    return assetFilePath;
  }

  @Bean
  @Primary
  AmazonS3 s3Client() {
    return AmazonS3ClientBuilder.standard().withRegion(region).build();
  }

  @Bean
  @Qualifier("pvt")
  AmazonS3 pvtS3Client() {
    return AmazonS3ClientBuilder.standard().withRegion(pvtAssetBucketRegion).build();
  }

  public enum AssetType {
    ProxyAsset,
    Screen,
    Tour,
    Common,
    UserGenerated,
    PublishedTour,
    Analytics,
    DemoHub,
    PublishedDemoHub,
    PvtTourInputData,
    PvtTourLlmOpsAssets,
    Dataset
  }

  public enum DATA_FILE_CACHE_POLICY {
    NoCache,
    StaleOk,
    Cache
  }

  public record PathConfigForClient(
    String commonAsset,
    String screenAsset,
    String tourAsset,
    String tourPublishedAsset,
    String leadAnalytics,
    String demoHubAsset,
    String demoHubPublishedAsset,
    String datasetAsset) {
  }

  public static class FileConfig {
    private final String __filename;
    private final VersionedFile replacer;
    private DATA_FILE_CACHE_POLICY __cachePolicy;

    FileConfig(String filename, DATA_FILE_CACHE_POLICY cachePolicy) {
      this.__filename = filename;
      this.__cachePolicy = cachePolicy;
      replacer = (f, v, c) -> f;
    }

    FileConfig(String filename, DATA_FILE_CACHE_POLICY cachePolicy, VersionedFile replacer) {
      this.__filename = filename;
      this.__cachePolicy = cachePolicy;
      this.replacer = replacer;
    }

    public String filename() {
      return __filename;
    }

    public String filename(Integer v) {
      return this.replacer.apply(this.__filename, v, null);
    }

    public String filename(Integer v, String name) {
      return this.replacer.apply(this.__filename, v, name);
    }

    public DATA_FILE_CACHE_POLICY cachePolicy() {
      return __cachePolicy;
    }

    public FileConfig overrideCachePolicy(DATA_FILE_CACHE_POLICY newPolicy) {
      this.__cachePolicy = newPolicy;
      return this;
    }
  }

  public record EntityFilesConfig(
    FileConfig tourDataFile,
    FileConfig screenDataFile,
    FileConfig editFile,
    FileConfig loaderFile,
    FileConfig imgFile,
    FileConfig publishedDataFile,
    FileConfig publishedEditFile,
    FileConfig publishedLoaderFile,
    FileConfig publishedTourEntityFile,
    FileConfig manifestFile,
    FileConfig leadActivityDataFile,
    FileConfig demoHubDataFile,
    FileConfig datasetFile) {
  }
}
