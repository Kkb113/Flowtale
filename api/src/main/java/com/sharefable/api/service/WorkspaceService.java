package com.sharefable.api.service;

import com.amazonaws.services.amplify.model.BadRequestException;
import com.amazonaws.services.amplify.model.DomainStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharefable.api.common.*;
import com.sharefable.api.config.AppSettings;
import com.sharefable.api.config.S3Config;
import com.sharefable.api.entity.ApiKey;
import com.sharefable.api.entity.EntityConfigKV;
import com.sharefable.api.entity.Org;
import com.sharefable.api.entity.User;
import com.sharefable.api.repo.*;
import com.sharefable.api.service.vendor.SlackMsgService;
import com.sharefable.api.transport.InviteCode;
import com.sharefable.api.transport.NfEvents;
import com.sharefable.api.transport.PvtAssetType;
import com.sharefable.api.transport.ReqExperimentConfig;
import com.sharefable.api.transport.req.*;
import com.sharefable.api.transport.resp.*;
import io.sentry.Sentry;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.javatuples.Pair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URL;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class WorkspaceService extends ServiceBase {
  private final OrgRepo orgRepo;
  private final S3Config s3Config;
  private final UserRepo userRepo;
  private final UserService userService;
  private final S3Service s3Service;
  private final NfHookService nfHookService;
  private final ApiKeyRepo apiKeyRepo;
  private final SlackMsgService slackMsgService;
  private final EntityConfigKVRepo entityConfigKVRepo;
  private final AwsAmplifyCustomDomainService customDomainService;
  private final EntityConfigService entityConfigService;
  private final SubscriptionService subscriptionService;
  private final AppSettings settings;
  private final ObjectMapper mapper = new ObjectMapper();

  @Autowired
  public WorkspaceService(OrgRepo orgRepo,
                          UserRepo userRepo,
                          S3Service s3Service,
                          S3Config s3Config,
                          AppSettings settings,
                          ScreenRepo screenRepo,
                          DemoEntityRepo demoEntityRepo,
                          UserService userService,
                          NfHookService nfHookService,
                          ApiKeyRepo apiKeyRepo,
                          SlackMsgService slackMsgService,
                          EntityConfigKVRepo entityConfigKVRepo,
                          AwsAmplifyCustomDomainService customDomainService,
                          EntityConfigService entityConfigService,
                          SubscriptionService subscriptionService) {
    super(settings, s3Service, s3Config, screenRepo, demoEntityRepo);
    this.orgRepo = orgRepo;
    this.userRepo = userRepo;
    this.s3Config = s3Config;
    this.s3Service = s3Service;
    this.userService = userService;
    this.nfHookService = nfHookService;
    this.apiKeyRepo = apiKeyRepo;
    this.settings = settings;
    this.slackMsgService = slackMsgService;
    this.entityConfigKVRepo = entityConfigKVRepo;
    this.customDomainService = customDomainService;
    this.entityConfigService = entityConfigService;
    this.subscriptionService = subscriptionService;
  }

  // is in the format test CNAME d3uxmturbrrjns.cloudfront.net
  // or this demo CNAME <pending>
  private VanityDomainRecords getRecordSetFromString(String recordSetStr, String type) {
    if (StringUtils.isBlank(recordSetStr)) return null;
    String[] recArr = StringUtils.split(recordSetStr, " ");
    return new VanityDomainRecords(
      DomainRecordType.CNAME,
      type,
      recArr[0],
      recArr[2]
    );
  }

  @Transactional
  public RespOrg createNewOrgAndAssignUserToIt(ReqNewOrg body, User user) {
    Pair<String, Boolean> domainInf = Utils.getDomainFromEmailForRespectiveEmail(user.getEmail());
    String emailDomain = domainInf.getValue0();

    String displayName = body.displayName();
    String rid = Utils.createReadableId(displayName);

    Org.OrgBuilder orgBuilder = Org.builder()
      .displayName(displayName)
      .domain(emailDomain)
      .createdBy(user)
      .users(Set.of(user))
      .rid(rid);
    if (StringUtils.isNotBlank(body.thumbnail())) {
      Optional<AssetFilePath> assetFilePath = uploadBase64ImageToS3(body.thumbnail(), S3Config.AssetType.Common);
      assetFilePath.ifPresent(filePath -> orgBuilder.thumbnail(filePath.getFilePath()));
    }
    Org org = orgBuilder.build();
    Org savedOrg = orgRepo.save(org);

    Object globalOpts = settings.getGlobalOpts();

    EntityConfigKV config = EntityConfigKV.builder()
      .entityType(ConfigEntityType.Org)
      .entityId(savedOrg.getId())
      .configType(EntityConfigConfigType.GLOBAL_OPTS)
      .configKey("GLOBAL OPTS")
      .configVal(globalOpts)
      .build();
    entityConfigKVRepo.save(config);

    nfHookService.sendNotification(NfEvents.NEW_ORG_CREATED, Map.of("id", savedOrg.getId().toString()));

    user.setBelongsToOrg(savedOrg.getId());
    userRepo.save(user);

    return RespOrg.from(savedOrg);
  }

  /*
   * TODO
   *  When a property of an entity object gets updated, the normal standard is to pass an array of following struct
   *  [{ prop: 'firstname', val: 'John' },
   *  { prop: 'lastname', val: 'Doe' }]
   *  this format is not implement here
   */
  @Transactional
  public RespUser updateUserFirstAndLastName(ReqUpdateUser body, User user) {
    user.setFirstName(body.firstName());
    user.setLastName(body.lastName());
    User savedUser = userRepo.save(user);

    if (StringUtils.isNotBlank(savedUser.getFirstName())) {
      userService.sendUserNf(savedUser.getEmail(), savedUser.getFirstName(), savedUser.getLastName());
    }

    return RespUser.from(savedUser);
  }

  @Transactional(readOnly = true)
  public RespOrg getOrgForUser(User user) {
    if (user.getBelongsToOrg() == null) return RespOrg.Empty();
    Optional<Org> org = orgRepo.findById(user.getBelongsToOrg());
    return org.map(RespOrg::from).orElse(RespOrg.Empty());
  }

  @Transactional(readOnly = true)
  public RespOrg getOrgByEmail(String email) {
    Pair<String, Boolean> domainInf = Utils.getDomainFromEmailForRespectiveEmail(email);
    String emailDomain = domainInf.getValue0();
    Set<Org> org = orgRepo.findOrgByDomain(emailDomain);
    return org.isEmpty() ? RespOrg.Empty() : RespOrg.from(org.iterator().next());
  }

  @Transactional
  public RespUser assignUserToImplicitOrg(User user) {
    Pair<String, Boolean> domainInf = Utils.getDomainFromEmailForRespectiveEmail(user.getEmail());
    String emailDomain = domainInf.getValue0();
    Set<Org> orgs = orgRepo.findOrgByDomain(emailDomain);

    if (!orgs.isEmpty()) {
      Org org = orgs.iterator().next();
      user.setBelongsToOrg(org.getId());
      user.setOrgs(orgs);
      userRepo.save(user);
    } else {
      log.error("No org present but call to assignUserToImplicitOrg is done by user {}", user);
    }
    return RespUser.from(user);
  }

  @Transactional(readOnly = true)
  public RespUser getUserWithOrgData(User user) {
    RespUser respUser = RespUser.from(user);
    // No DB operation should happen if the user is part of an org already.
    if (user.getBelongsToOrg() == null) {
      Pair<String, Boolean> domainInf = Utils.getDomainFromEmailForRespectiveEmail(user.getEmail());
      String emailDomain = domainInf.getValue0();
      // If user is not part of an org then find out is there implicit org that is present as part of user's
      // email domain
      Set<Org> orgs = orgRepo.findOrgByDomain(emailDomain);
      respUser.setOrgAssociation(!orgs.isEmpty()
        ? RespUser.UserOrgAssociation.Implicit
        : RespUser.UserOrgAssociation.NA);
    } else {
      respUser.setOrgAssociation(RespUser.UserOrgAssociation.Explicit);
    }
    return respUser;
  }

  @Transactional
  public RespGlobalOpts updateGlobalOpts(ReqUpdateGlobalOpts body, User user) {
    EntityConfigKV entityConfigKV = entityConfigService.getEntityConfig(ConfigEntityType.Org, user.getBelongsToOrg(), EntityConfigConfigType.GLOBAL_OPTS);
    entityConfigKV.setConfigVal(body.editData());
    EntityConfigKV savedEntityConfigKv = entityConfigKVRepo.save(entityConfigKV);

    return RespGlobalOpts.builder().globalOpts(savedEntityConfigKv.getConfigVal()).build();
  }

  @Transactional
  public RespGlobalOpts getGlobalOpts(User user) {
    EntityConfigKV entityConfigKV = entityConfigService.getEntityConfig(ConfigEntityType.Org, user.getBelongsToOrg(), EntityConfigConfigType.GLOBAL_OPTS);
    return RespGlobalOpts.builder().globalOpts(entityConfigKV.getConfigVal()).build();
  }

  public void getCommonConfig(RespCommonConfig.RespCommonConfigBuilder builder) {
    S3Config.PathConfigForClient pathConfig = s3Config.getPathConfigForClient();
    S3Config.EntityFilesConfig entityFilesConfig = S3Config.getEntityFiles();
    builder
      .commonAssetPath(pathConfig.commonAsset())
      .screenAssetPath(pathConfig.screenAsset())
      .tourAssetPath(pathConfig.tourAsset())
      .pubTourAssetPath(pathConfig.tourPublishedAsset())
      .demoHubAssetPath(pathConfig.demoHubAsset())
      .pubDemoHubAssetPath(pathConfig.demoHubPublishedAsset())
      .datasetAssetPath(pathConfig.datasetAsset())

      // Although we have now tourDataFile and screenDataFile treated differently when it comes to cache policy,
      // in client side we send dataFileName as index.json
      // In this case both tourDataFile and screenDataFile is same
      .dataFileName(entityFilesConfig.tourDataFile().filename())
      .loaderFileName(entityFilesConfig.loaderFile().filename())
      .editFileName(entityFilesConfig.editFile().filename())
      .manifestFileName(entityFilesConfig.manifestFile().filename())
      .datasetFileName(entityFilesConfig.datasetFile().filename());
  }

  public RespUploadUrl getPreSignedUrlToUploadFile(User user, String contentType, Optional<String> extension) {
    String filename = Utils.createUuidWord();
    if (extension.isPresent()) {
      filename += StringUtils.prependIfMissing(extension.get(), ".");
    }
    AssetFilePath filePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.UserGenerated, user.getBelongsToOrg().toString(), filename);
    URL url = s3Service.preSignedUrl(filePath, contentType);
    log.warn("content type {} url {}", contentType, url);
    return RespUploadUrl.builder()
      .url(url.toString())
      .cdnPath(filePath.getS3UriToFile())
      .expiry("default")
      .filename(filename)
      .build();
  }

  public RespUploadUrl getPvtPreSignedUrl(String contentType, String prefix, String filename, PvtAssetType assetType) {
    AssetFilePath filePath = s3Config.getQualifiedPathFor(switch (assetType) {
      case MarkedImgs -> S3Config.AssetType.PvtTourLlmOpsAssets;
      case TourInputData -> S3Config.AssetType.PvtTourInputData;
    }, prefix, filename);
    URL url = s3Service.preSignedUrl(filePath, contentType);
    log.warn("content type {} url {}", contentType, url);
    return RespUploadUrl.builder()
      .url(url.toString())
      .expiry("default")
      .filename(filename)
      .build();
  }

  public RespUser activateOrDeactivateUser(Long targetUserId, Boolean activate, User reqByUser) {
    Optional<User> maybeUser = userRepo.findById(targetUserId);
    if (maybeUser.isEmpty()) return null;
    User targetUser = maybeUser.get();
    if (!Objects.equals(targetUser.getBelongsToOrg(), reqByUser.getBelongsToOrg()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Users not from same org");

    User changedUser = userService.setUserActiveOrInactive(targetUser, activate);
    return RespUser.from(changedUser);
  }

  @Transactional
  public RespApiKey createNewApiKey(User user) {
    List<ApiKey> apiKeys = apiKeyRepo.getApiKeysByOrgId(user.getBelongsToOrg());
    Optional<Org> org = orgRepo.findById(user.getBelongsToOrg());
    if (org.isEmpty()) return null;

    String shortRid = StringUtils.substring(org.get().getRid(), 0, 5).replace("-", "");
    String apiKey = String.format("%s:%s",
      shortRid,
      Utils.createUuidWord() + Long.toHexString(Timestamp.from(Instant.now()).getTime()) + Utils.createUuidWord()
    );

    ApiKey newKey = ApiKey.builder()
      // 32 + ~11 + 32 chars
      .apiKey(apiKey)
      .active(true)
      .createdBy(user)
      .org(org.get())
      .build();

    List<ApiKey> inactiveKeys = apiKeys.stream().filter(ApiKey::getActive).peek(key -> key.setActive(false)).toList();
    newKey = apiKeyRepo.save(newKey);
    apiKeyRepo.saveAll(inactiveKeys);
    return RespApiKey.from(newKey);
  }

  public ApiKey getApiKey(String apiKey) {
    return apiKeyRepo.getApiKeyByApiKeyAndActiveIsTrue(apiKey);
  }

  public RespApiKey getActiveApiKeysForOrg(Long orgId) {
    ApiKey apiKey = apiKeyRepo.getFirstApiKeyByOrgIdAndActiveIsTrueOrderByUpdatedAtDesc(orgId);
    return apiKey == null ? null : RespApiKey.from(apiKey);
  }

  @Transactional
  public RespOrg updateOrgInfo(ReqUpdateOrg updateOrg, User user) {
    Optional<Org> maybeOrg = orgRepo.findById(user.getBelongsToOrg());
    if (maybeOrg.isEmpty()) return RespOrg.Empty();

    Org org = maybeOrg.get();
    org.setInfo(updateOrg.orgInfo());
    Org savedOrg = orgRepo.save(org);
    return RespOrg.from(savedOrg);
  }

  @Transactional
  public RespNewInvite createNewInvite(ReqNewInvite newInvite, User user) {
    Optional<Org> maybeOrg = orgRepo.findById(user.getBelongsToOrg());
    if (maybeOrg.isEmpty()) return RespNewInvite.Empty();

    InviteCode inviteCode = InviteCode.builder()
      .invitedEmail(newInvite.getInvitedEmail())
      .orgId(maybeOrg.get().getId())
      .build();
    String inviteCodeString;

    try {
      inviteCodeString = mapper.writeValueAsString(inviteCode);
    } catch (Exception e) {
      log.error("Something went wrong while converting invite code to string", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while converting invite code to string");
    }

    return RespNewInvite.builder()
      .code(Base64.getEncoder().encodeToString(inviteCodeString.getBytes()))
      .build();
  }

  @Transactional(readOnly = true)
  public List<RespOrg> getAllOrgForUser(User user) {
    Set<Org> orgs = new HashSet<>(user.getOrgs() != null ? user.getOrgs() : Set.of());
    return orgs.stream().map(RespOrg::from).collect(Collectors.toList());
  }

  @Transactional
  public Pair<RespUser, RespOrg> assignOrgToUser(ReqAssignOrgToUser body, User user) {
    Optional<Org> maybeOrg = orgRepo.findById(body.orgId());
    if (maybeOrg.isEmpty()) return Pair.with(RespUser.from(user), RespOrg.Empty());

    Set<Org> orgs = user.getOrgs();
    orgs.add(maybeOrg.get());
    user.setBelongsToOrg(maybeOrg.get().getId());
    user.setOrgs(orgs);
    User savedUser = userRepo.save(user);
    subscriptionService.updateNoOfSeatInSubscription(body.orgId());
    return Pair.with(RespUser.from(savedUser), RespOrg.from(maybeOrg.get()));
  }

  public List<RespVanityDomain> getAllVanityDomains(Long orgId) {
    List<EntityConfigKV> config = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.VANITY_DOMAIN
    );
    return config.stream().map(entry -> mapper.convertValue(entry.getConfigVal(), VanityDomain.class))
      .map(RespVanityDomain::from).toList();
  }

  private Pair<Optional<Pair<VanityDomain, EntityConfigKV>>, List<VanityDomain>> getDomainIfExists(Long orgId, String apexDomain, String fullDomain) {
    List<EntityConfigKV> domainConfig = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.VANITY_DOMAIN,
      apexDomain
    );

    if (domainConfig == null || domainConfig.isEmpty()) return Pair.with(Optional.empty(), List.of());

    List<VanityDomain> subdomains = new ArrayList<>();
    Optional<Pair<VanityDomain, EntityConfigKV>> thisDomain = Optional.empty();
    for (EntityConfigKV entityConfigKV : domainConfig) {
      VanityDomain vanityDomain = mapper.convertValue(entityConfigKV.getConfigVal(), VanityDomain.class);
      if (StringUtils.equalsIgnoreCase(vanityDomain.getDomainName(), fullDomain)) {
        thisDomain = Optional.of(Pair.with(vanityDomain, entityConfigKV));
      } else {
        subdomains.add(vanityDomain);
      }
    }

    return Pair.with(thisDomain, subdomains);
  }

  @Transactional
  public RespVanityDomain addNewVanityDomain(ReqCreateOrDeleteNewVanityDomain req, Long orgId, User user) {
    // If the domain is already present in db that means a request has been sent already in that case simply
    // return the value
    Pair<Optional<Pair<VanityDomain, EntityConfigKV>>, List<VanityDomain>> maybeDomain = getDomainIfExists(orgId, req.getApexDomainName(), req.getDomainName());
    if (maybeDomain.getValue0().isPresent()) {
      return RespVanityDomain.from(maybeDomain.getValue0().get().getValue0());
    }

    // If a new domain request is sent
    VanityDomain.VanityDomainBuilder vanityDomainBuilder = VanityDomain.builder()
      .domainName(req.getDomainName())
      .subdomainName(req.getSubdomainName())
      .apexDomainName(req.getApexDomainName())
      .createdAt(Timestamp.from(Instant.now()));

    VanityDomain vanityDomain;
    String reasonForManualRequest = "";
    boolean fatalError = false;
    try {
      Optional<ProxyClusterCreationData> maybeCluster = customDomainService.getProvisionedClusterForNewSSLCreation(req.getApexDomainName());
      ProxyClusterCreationData clusterWithData = maybeCluster.orElseThrow(() -> new RuntimeException("No empty cluster found for ssl cert creation"));

      vanityDomain = vanityDomainBuilder
        .cluster(clusterWithData.getCluster().name())
        .status(VanityDomainDeploymentStatus.InProgress).build();

      List<VanityDomain> allDomainsToAdd = new ArrayList<>();
      allDomainsToAdd.add(vanityDomain);
      allDomainsToAdd.addAll(maybeDomain.getValue1());
      if (clusterWithData.isApexDomainPresent()) {
        // Apex domain with subdomain already present then update
        customDomainService.updateExistingDomain(clusterWithData.getCluster(), req.getApexDomainName(), allDomainsToAdd);
      } else {
        // If there is no apex domain registered before register a new one
        customDomainService.registerNewDomain(clusterWithData.getCluster(), req.getApexDomainName(), allDomainsToAdd);
      }
    } catch (BadRequestException e) {
      log.error("Bad request while creating ssl cert upstream", e);
      Sentry.captureException(e);
      fatalError = true;
      vanityDomain = vanityDomainBuilder.status(VanityDomainDeploymentStatus.ManualInterventionNeeded).build();
    } catch (Exception e) {
      vanityDomain = vanityDomainBuilder.status(VanityDomainDeploymentStatus.ManualInterventionNeeded).build();
      reasonForManualRequest = e.getMessage();
      log.error("Error while creating ssl cert upstream", e);
      Sentry.captureException(e);
    }
    EntityConfigKV savedConfig = null;
    if (!fatalError) {
      EntityConfigKV config = EntityConfigKV.builder()
        .entityType(ConfigEntityType.Org)
        .entityId(orgId)
        .configType(EntityConfigConfigType.VANITY_DOMAIN)
        .configKey(req.getApexDomainName())
        .configVal(vanityDomain)
        .build();
      savedConfig = entityConfigKVRepo.save(config);
    }

    if (
      fatalError
        || vanityDomain.getStatus() == VanityDomainDeploymentStatus.Requested
        || vanityDomain.getStatus() == VanityDomainDeploymentStatus.ManualInterventionNeeded) {
      Long id = savedConfig == null ? -1 : savedConfig.getId();
      try {
        slackMsgService.sendCustomDomainReq(
          orgId,
          user.getEmail(),
          id,
          "issue_new",
          reasonForManualRequest,
          vanityDomain
        );
      } catch (IOException e) {
        log.error("Couldn't send slack notification for new custom domain. Issue new {}", id);
        Sentry.captureException(e);
      }
    }
    return RespVanityDomain.from(vanityDomain);
  }

  @Transactional
  public List<RespVanityDomain> deleteVanityDomain(ReqCreateOrDeleteNewVanityDomain req, Long orgId) {
    Pair<Optional<Pair<VanityDomain, EntityConfigKV>>, List<VanityDomain>> maybeDomain = getDomainIfExists(orgId, req.getApexDomainName(), req.getDomainName());
    if (maybeDomain.getValue0().isEmpty()) return getAllVanityDomains(orgId);


    List<VanityDomain> subdomains = maybeDomain.getValue1();
    VanityDomain subdomainTobeDeleted = maybeDomain.getValue0().get().getValue0();
    if (subdomainTobeDeleted.getCluster() != null) {
      if (!subdomains.isEmpty()) {
        // if subdomain exists for apex domain just delete the subdomain
        customDomainService.updateExistingDomain(subdomainTobeDeleted.getCluster(), req.getApexDomainName(), subdomains);
      } else {
        customDomainService.deleteDomain(subdomainTobeDeleted.getCluster(), req.getApexDomainName());
      }
    }

    entityConfigKVRepo.delete(maybeDomain.getValue0().get().getValue1());
    return getAllVanityDomains(orgId);
  }

  @Transactional
  public RespVanityDomain getAndUpdateStatusForVanityDomain(ReqCreateOrDeleteNewVanityDomain req, Long orgId) {
    Pair<Optional<Pair<VanityDomain, EntityConfigKV>>, List<VanityDomain>> maybeDomain = getDomainIfExists(orgId, req.getApexDomainName(), req.getDomainName());

    if (maybeDomain.getValue0().isEmpty()) return null;
    VanityDomain vanityDomain = maybeDomain.getValue0().get().getValue0();

    if (vanityDomain.getStatus() == VanityDomainDeploymentStatus.InProgress
      || vanityDomain.getStatus() == VanityDomainDeploymentStatus.VerificationPending
      || vanityDomain.getStatus() == VanityDomainDeploymentStatus.DeploymentPending
    ) {
      DomainAssociationStatus associationStatus = customDomainService.getAssociationStatus(vanityDomain);

      VanityDomainRecords subdomainRecord = getRecordSetFromString(associationStatus.getSubdomainDNSRecords(), "Subdomain Record");
      VanityDomainRecords verificationRecord = getRecordSetFromString(associationStatus.getCertificateVerificationDNSRecords(), "Verification Record");
      List<VanityDomainRecords> records = new LinkedList<>();
      if (subdomainRecord != null) records.add(subdomainRecord);
      if (verificationRecord != null) records.add(verificationRecord);
      vanityDomain.setRecords(records);

      if (associationStatus.getApexDomainVerificationStatus() == DomainStatus.PENDING_VERIFICATION
        || associationStatus.getApexDomainVerificationStatus() == DomainStatus.UPDATING) {
        vanityDomain.setStatus(VanityDomainDeploymentStatus.VerificationPending);
      } else if (associationStatus.getApexDomainVerificationStatus() == DomainStatus.FAILED) {
        String failureReason = associationStatus.getStatusReason();
        if (StringUtils.isNotBlank(failureReason) && StringUtils.containsIgnoreCase(failureReason, "CAA record that does not include Amazon as an approved Certificate Authority")) {
          vanityDomain.setRejectionReason("CAA_INVALID");
        }
        vanityDomain.setStatus(VanityDomainDeploymentStatus.Failed);
      } else if (associationStatus.getApexDomainVerificationStatus() == DomainStatus.AVAILABLE) {
        vanityDomain.setStatus(VanityDomainDeploymentStatus.Issued);
      } else if (associationStatus.getApexDomainVerificationStatus() == DomainStatus.PENDING_DEPLOYMENT) {
        vanityDomain.setStatus(VanityDomainDeploymentStatus.DeploymentPending);
      }
    }
    EntityConfigKV conf = maybeDomain.getValue0().get().getValue1();
    conf.setConfigVal(vanityDomain);
    entityConfigKVRepo.save(conf);
    return RespVanityDomain.from(vanityDomain);
  }

  @Transactional
  public List<RespCustomField> addCustomFields(ReqCreateOrDeleteCustomFields req, Long orgId) {
    List<EntityConfigKV> existingCustomFields = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKeyIn(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.CUSTOM_FORM_FIELDS,
      req.customFields()
    );

    Set<String> fieldsTobeAdded = req.customFields();
    for (EntityConfigKV field : existingCustomFields) {
      fieldsTobeAdded.remove(field.getConfigKey());
    }


    List<EntityConfigKV> configs = fieldsTobeAdded.stream().map(field -> {
      EntityConfigKV entityConfigKV = new EntityConfigKV();
      entityConfigKV.setEntityType(ConfigEntityType.Org);
      entityConfigKV.setEntityId(orgId);
      entityConfigKV.setConfigType(EntityConfigConfigType.CUSTOM_FORM_FIELDS);
      entityConfigKV.setConfigKey(field);
      entityConfigKV.setConfigVal(null);
      return entityConfigKV;
    }).toList();

    entityConfigKVRepo.saveAll(configs);
    return getAllCustomFields(orgId);
  }

  @Transactional
  public List<RespCustomField> getAllCustomFields(Long orgId) {
    List<EntityConfigKV> customFields = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.CUSTOM_FORM_FIELDS
    );

    return customFields.stream().map(RespCustomField::from).toList();
  }

  @Transactional
  public List<RespCustomField> deleteCustomFields(ReqCreateOrDeleteCustomFields req, Long orgId) {
    List<EntityConfigKV> existingCustomFields = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKeyIn(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.CUSTOM_FORM_FIELDS,
      req.customFields()
    );

    entityConfigKVRepo.deleteAll(existingCustomFields);
    return getAllCustomFields(orgId);
  }

  @Transactional
  public RespDataset publishDataset(ReqNewDataset req, User user) {
    Map<String, EntityConfigKV> entityConfigKVMap = convertEntityConfigListToMap(user.getBelongsToOrg());

    if (!entityConfigKVMap.containsKey(req.name())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dataset not found for name " + req.name() + " ,so won't be able to publish");
    }

    EntityConfigKV entityConfigKV = entityConfigKVMap.get(req.name());
    Dataset dataset = mapper.convertValue(entityConfigKVMap.get(req.name()).getConfigVal(), Dataset.class);
    Integer nextVersion = dataset.getLastPublishedVersion() + 1;

    dataset.setLastPublishedDate(Utils.getCurrentUtcTimestamp());
    dataset.setLastPublishedVersion(nextVersion);
    entityConfigKV.setConfigVal(dataset);

    AssetFilePath fromDatasetFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Dataset, user.getBelongsToOrg().toString(), S3Config.getEntityFiles().datasetFile().filename(0, req.name()));

    AssetFilePath toDatasetFilePath = s3Config.getQualifiedPathFor(
      S3Config.AssetType.Dataset, user.getBelongsToOrg().toString(), S3Config.getEntityFiles().datasetFile().filename(nextVersion, req.name()));
    s3Service.copy(fromDatasetFilePath, toDatasetFilePath, Map.of(
      HttpHeaders.CONTENT_TYPE, "application/json",
      HttpHeaders.CACHE_CONTROL, S3Config.getCachePolicyStr(S3Config.getEntityFiles().datasetFile().cachePolicy())));

    entityConfigKVRepo.save(entityConfigKV);
    return RespDataset.from(dataset, user.getBelongsToOrg());
  }

  @Transactional
  public List<RespDataset> getAllDataset(Long orgId) {
    List<EntityConfigKV> entityConfig = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(ConfigEntityType.Org, orgId, EntityConfigConfigType.DATASET);
    return entityConfig.stream()
      .map(entity -> mapper.convertValue(entity.getConfigVal(), Dataset.class))
      .map(dataset -> RespDataset.from(dataset, orgId))
      .toList();
  }

  @Transactional
  public RespDataset getDataset(String name, Long orgId) {
    List<EntityConfigKV> entityConfig = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org, orgId, EntityConfigConfigType.DATASET, name
    );

    if (entityConfig.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No dataset present for the requested name " + name);
    }
    try {
      Dataset dataset = mapper.convertValue(entityConfig.get(0).getConfigVal(), Dataset.class);
      return RespDataset.from(dataset, orgId);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Probably the dataset does not contain value but key exists" + name);
    }
  }

  @Transactional
  public RespDataset createAndGetPreSignedUrlToUploadDataSet(ReqNewDataset req, User user) {
    try {
      Map<String, EntityConfigKV> entityConfigKVMap = convertEntityConfigListToMap(user.getBelongsToOrg());

      Dataset dataset;

      AssetFilePath filePath = s3Config.getQualifiedPathFor(
        S3Config.AssetType.Dataset, user.getBelongsToOrg().toString(), S3Config.getEntityFiles().datasetFile().filename(0, req.name()));

      if (entityConfigKVMap.isEmpty() || !entityConfigKVMap.containsKey(req.name())) {
        EntityConfigKV entityConfigKV = createDataSet(req, user.getBelongsToOrg());
        dataset = mapper.convertValue(entityConfigKV.getConfigVal(), Dataset.class);
        uploadTemplateFileToS3(filePath, DATA_FILE_TYPE.DATASET);
      } else {
        log.info("Dataset already exists, so only generating presigned url");
        dataset = mapper.convertValue(entityConfigKVMap.get(req.name()).getConfigVal(), Dataset.class);
      }

      URL url = s3Service.preSignedUrl(filePath, "application/json");
      RespUploadUrl respUploadUrl = RespUploadUrl.builder()
        .url(url.toString())
        .expiry("expiry")
        .filename(req.name())
        .build();
      return RespDataset.from(dataset, respUploadUrl, user.getBelongsToOrg());
    } catch (Exception e) {
      log.error("Something went wrong while #createAndGetPreSignedUrlToUploadDataSet", e);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong while creating a dataset" + e);
    }
  }

  @Transactional
  public EntityConfigKV createDataSet(ReqNewDataset req, Long orgId) {
    Dataset dataset = Dataset.builder()
      .name(req.name())
      .lastPublishedVersion(0)
      .lastPublishedDate(null)
      .description(req.description().orElse(""))
      .build();

    EntityConfigKV entityConfigKV = EntityConfigKV.builder()
      .entityId(orgId)
      .entityType(ConfigEntityType.Org)
      .configType(EntityConfigConfigType.DATASET)
      .configKey(req.name())
      .configVal(dataset)
      .build();

    return entityConfigKVRepo.save(entityConfigKV);
  }

  @Transactional
  public Map<String, EntityConfigKV> convertEntityConfigListToMap(Long orgId) {
    List<EntityConfigKV> entityConfigKVList = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigType(ConfigEntityType.Org, orgId, EntityConfigConfigType.DATASET);

    return entityConfigKVList.isEmpty() ?
      new HashMap<>() : entityConfigKVList.stream()
      .collect(Collectors.toMap(
        EntityConfigKV::getConfigKey,
        entity -> entity
      ));
  }

  @Transactional
  public List<RespDataset> removeDataset(String datasetName, Long orgId) {

    List<EntityConfigKV> entityConfigKVbyConfigKey = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.DATASET,
      datasetName);

    if (entityConfigKVbyConfigKey.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "The Dataset is not present, can't delete " + datasetName);
    }
    entityConfigKVRepo.deleteEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.DATASET,
      datasetName);

    return entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeIn(ConfigEntityType.Org, orgId, Set.of(EntityConfigConfigType.DATASET)).stream()
      .map(entity -> mapper.convertValue(entity.getConfigVal(), Dataset.class))
      .map(dataset -> RespDataset.from(dataset, orgId))
      .toList();
  }

  @Transactional
  public RespDataset updateDataset(ReqNewDataset body, Long orgId) {
    List<EntityConfigKV> entityConfig = entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      orgId,
      EntityConfigConfigType.DATASET,
      body.name());

    if (entityConfig.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "The Dataset is not present, can't update " + body.name());
    }
    EntityConfigKV entityConfigKV = entityConfig.get(0);
    Dataset dataset = mapper.convertValue(entityConfigKV.getConfigVal(), Dataset.class);
    body.description().ifPresent(dataset::setDescription);
    entityConfigKV.setConfigVal(dataset);

    entityConfigKVRepo.save(entityConfigKV);
    return RespDataset.from(dataset, orgId);
  }

  public EntityConfigKV setConfigForExperiments(ReqExperimentConfig body, Long belongsToOrg) {
    List<EntityConfigKV> configForExperiments = getConfigForExperiments(body.key(), belongsToOrg);
    EntityConfigKV config;
    if (configForExperiments.isEmpty()) {
      config = EntityConfigKV.builder()
        .entityType(ConfigEntityType.Org)
        .entityId(belongsToOrg)
        .configType(EntityConfigConfigType._EXP_)
        .configKey(body.key())
        .configVal(body.value())
        .build();
    } else {
      config = configForExperiments.get(0);
      config.setConfigVal(body.value());
    }
    return entityConfigKVRepo.save(config);
  }

  public List<EntityConfigKV> getConfigForExperiments(String key, Long belongsToOrg) {
    return entityConfigKVRepo.findEntityConfigKVSByEntityTypeAndEntityIdAndConfigTypeAndConfigKey(
      ConfigEntityType.Org,
      belongsToOrg,
      EntityConfigConfigType._EXP_,
      key
    );
  }
}
