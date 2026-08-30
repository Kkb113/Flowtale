package com.sharefable;

public interface Routes {
  String API_V1 = "/v1";

  /* === Vendor prefix === */
  String COBALT = "/vr/ct";
  String EMBEDLY = "/vr/embdly";
  String APP_SUMO = "/vr/as";
  String HUBSPOT = "/vr/hs";
  String ZAPIER = "/vr/zp";

  /* === Routes w/o authentication === */
  String HEALTH = "/health";
  String DEBUG = "/debug";
  String GET_COMMON_CONFIG = "/cconfig";
  String GET_SCREEN = "/screen";
  String GET_TOUR = "/tour";
  String REPUBLISH_DATA_FILE_ONLY = "repub/entity/rid/{rid}";
  String GET_TOUR_BY_ID = "/tour/by/id/{id}";
  @Deprecated
  String LOG_USER_EVENTS = "/lue";
  @Deprecated
  String LOG_USER_EVENTS_DIRECT = "/lued";
  String NF_HOOK = "/nfhook";
  String REFRESH_SETTINGS = "/refreshsettings";
  String CHARGEBEE_WEBHOOK = "/wh/cb";
  String API_KEY_WEBHOOK_PROBE = "/apikey/probe";
  String FEATURE_PLAN_MATRIX = "/featureplanmtx";

  // only for migration
  String PUBLISH_TOUR_INTERNAL = "/m/tpub";
  String COPY_TOUR_TO_DIFFERENT_ORG = "m/cpytrdifforg";

  // internal data entry routes
  String ADD_OR_UPDATE_PLATFORM_INTEGRATION = "/ide/platform_integration";
  String REFILL_FABLE_CREDIT = "/ide/refill_fable_credit/{org_id}";
  String MIGRATE_FABLE_CREDIT = "/ide/migrate_fable_credit/{org_id}";

  /* === Routes with authentication === */
  String __BEHIND_LOGIN__ = "/f"; // f => behind spring security [F]ilters for authentication
  String IAM = __BEHIND_LOGIN__ + "/iam";
  String NEW_ORG = __BEHIND_LOGIN__ + "/neworg";
  String GET_ORG = __BEHIND_LOGIN__ + "/org";
  String GET_ALL_VANITY_DOMAINS = __BEHIND_LOGIN__ + "/vanitydomains";
  String ADD_NEW_VANITY_DOMAIN = __BEHIND_LOGIN__ + "/vanitydomain";
  String PROBE_VANITY_DOMAIN = __BEHIND_LOGIN__ + "/vanitydomain/probe";
  String DEL_VANITY_DOMAIN = __BEHIND_LOGIN__ + "/delvanitydomains";
  String UPDATE_ORG_PROPS = __BEHIND_LOGIN__ + "/updtorgprops";
  String UPDATE_SUBS_PROPS = __BEHIND_LOGIN__ + "/updtsubprops";
  String ASSIGN_IMPLICIT_USER_ORG = __BEHIND_LOGIN__ + "/assgnimplorg";
  String UPDATE_USER_PROP = __BEHIND_LOGIN__ + "/userprop";
  String USER_SIGNUP_DETAILS = __BEHIND_LOGIN__ + "/usrsudet";
  String PROXY_ASSET = __BEHIND_LOGIN__ + "/proxyasset";
  String NEW_SCREEN = __BEHIND_LOGIN__ + "/newscreen";
  String CREATE_THUMBNAIL = __BEHIND_LOGIN__ + "/genthumb";
  String GET_ALL_SCREENS = __BEHIND_LOGIN__ + "/screens";
  String COPY_SCREEN = __BEHIND_LOGIN__ + "/copyscreen";
  String ASSOCIATE_SCREEN_TO_TOUR = __BEHIND_LOGIN__ + "/astsrntotour";
  String GET_ALL_TOURS = __BEHIND_LOGIN__ + "/tours";
  String NEW_TOUR = __BEHIND_LOGIN__ + "/newtour";
  String DELETE_TOUR = __BEHIND_LOGIN__ + "/deltour";
  String UPDATE_TOUR_PROPERTY = __BEHIND_LOGIN__ + "/updtrprop";
  String UPLOAD_LINK = __BEHIND_LOGIN__ + "/getuploadlink";
  String PVT_UPLOAD_LINK = __BEHIND_LOGIN__ + "/getpvtuploadlink";
  String RECORD_EL_EDIT = __BEHIND_LOGIN__ + "/recordeledit";
  String RECORD_TOUR_EDIT = __BEHIND_LOGIN__ + "/recordtredit";
  String RECORD_TOUR_EDIT_FILE = __BEHIND_LOGIN__ + "/recordtrgbedit";
  String RECORD_TOUR_LOADER_EDIT = __BEHIND_LOGIN__ + "/recordtrloaderedit";
  String UPDATE_GLOBAL_OPTS = __BEHIND_LOGIN__ + "/updtgopts";
  String GET_GLOBAL_OPTS = __BEHIND_LOGIN__ + "/gopts";
  String RENAME_TOUR = __BEHIND_LOGIN__ + "/renametour";
  String RENAME_SCREEN = __BEHIND_LOGIN__ + "/renamescreen";
  String UPDATE_SCREEN_PROPERTY = __BEHIND_LOGIN__ + "/updatescreenproperty";
  String DUPLICATE_TOUR = __BEHIND_LOGIN__ + "/duptour";
  String ONBOARDING_TOUR = __BEHIND_LOGIN__ + "/conbtrs";
  String ONBOARDING_TOUR_PREVIEW_ONLY = __BEHIND_LOGIN__ + "/onbtrspreview";
  String TRANSCODE_VIDEO = __BEHIND_LOGIN__ + "/vdt";
  String TRANSCODE_AUDIO = __BEHIND_LOGIN__ + "/audt";
  String RESIZE_IMG = __BEHIND_LOGIN__ + "/rzeimg";
  String CHECKOUT = __BEHIND_LOGIN__ + "/checkout";
  String GET_SUBSCRIPTION = __BEHIND_LOGIN__ + "/subs";
  String VALIDATE_SUBSCRIPTION_FOR_UPGRADE_OR_DOWNGRADE = __BEHIND_LOGIN__ + "/subsvalid";
  String GET_ALL_USER_IN_ORG = __BEHIND_LOGIN__ + "/users";
  String ACTIVATE_OR_DEACTIVATE_USER = __BEHIND_LOGIN__ + "/aodusr";
  String GEN_CHECKOUT_URL = __BEHIND_LOGIN__ + "/genchckouturl";
  String PUBLISH_TOUR = __BEHIND_LOGIN__ + "/tpub";
  String TOKEN_FOR_LINKED_ACCOUNT = __BEHIND_LOGIN__ + COBALT + "/tknlnkdacc";
  String LIST_APPS_FOR_LINKED_ACCOUNT = __BEHIND_LOGIN__ + COBALT + "/lstapp";
  String COBALT_EVENT_AUTHED = __BEHIND_LOGIN__ + COBALT + "/evnt";
  String EMBEDLY_EMBED = EMBEDLY + "/embed";
  String TENANT_INTEGRATIONS = __BEHIND_LOGIN__ + "/tenant_integrations";
  String TENANT_INTEGRATION = __BEHIND_LOGIN__ + "/tenant_integration";
  String DEL_TENANT_INTEGRATION = __BEHIND_LOGIN__ + "/delete/tenant_integration/{id}";
  String CREATE_NEW_API_KEY = __BEHIND_LOGIN__ + "/new/apikey";
  String GET_API_KEY = __BEHIND_LOGIN__ + "/apikey";
  String NEW_INVITE = __BEHIND_LOGIN__ + "/new/invite";
  String ALL_ORG_FOR_USER = __BEHIND_LOGIN__ + "/orgsfruser";
  String ASSIGN_ORG_TO_USER = __BEHIND_LOGIN__ + "/orgstouser";
  String ADD_NEW_CUSTOM_FIELDS = __BEHIND_LOGIN__ + "/addcfields";
  String DELETE_CUSTOM_FIELDS = __BEHIND_LOGIN__ + "/delcfields";
  String GET_FIELDS = __BEHIND_LOGIN__ + "/cfields";
  String ENTITY_METRICS = __BEHIND_LOGIN__ + "/entity_metrics";
  String LEADS = __BEHIND_LOGIN__ + "/leads";
  String ENTITY_METRICS_DAILY = __BEHIND_LOGIN__ + "/entity_metrics_daily";
  String ENTITY_SUBENTITY_DIST_METRICS = __BEHIND_LOGIN__ + "/entity_subentity_dist_metrics";
  String ACTIVITY_DATA = __BEHIND_LOGIN__ + "/activity_data/{entityRid}/{aid}";
  String GET_ORG_LEVEL_LEAD_ANALYTICS = __BEHIND_LOGIN__ + "/org/lead_analytics";
  String DEDUCT_CREDIT = __BEHIND_LOGIN__ + "/deductcredit";
  String NEW_DATASET = __BEHIND_LOGIN__ + "/newds";
  String PUBLISH_DATASET = __BEHIND_LOGIN__ + "/pubds";
  String GET_ALL_DATASET = __BEHIND_LOGIN__ + "/ds";
  String GET_DATASET = __BEHIND_LOGIN__ + "/ds/{name}";
  String DELETE_DATASET = __BEHIND_LOGIN__ + "/ds/del/{name}";
  String UPDATE_DATASET = __BEHIND_LOGIN__ + "/ds/updtprop";
  String EXP_SET_CONFIG = __BEHIND_LOGIN__ + "/exp/config";
  String EXP_GET_CONFIG = __BEHIND_LOGIN__ + "/exp/config/{key}";

  /* === Demo Hub === */
  String CREATE_DEMO_HUB = __BEHIND_LOGIN__ + "/demohub";
  String RENAME_DEMO_HUB = __BEHIND_LOGIN__ + "/renamedh";
  String UPDATE_DEMO_HUB_PROP = __BEHIND_LOGIN__ + "/updtdhprops";
  String DELETE_DEMO_HUB = __BEHIND_LOGIN__ + "/deldh";
  String GET_ALL_DEMO_HUB = __BEHIND_LOGIN__ + "/dhs";
  String GET_DEMO_HUB = "/dh";
  String PUBLISH_DEMO_HUB = __BEHIND_LOGIN__ + "/pubdh";
  String RECORD_EDIT_DEMO_HUB = __BEHIND_LOGIN__ + "/recorddhedit";
  String NEW_LLM_RUN = __BEHIND_LOGIN__ + "/llmrun";
  String GET_LLM_RUNS = __BEHIND_LOGIN__ + "/llmruns/{thread_id}";
  String UPDATE_LLM_RUN = __BEHIND_LOGIN__ + "/updatellmrun";
  String GEN_AI_CREDIT_CHECKOUT_URL = __BEHIND_LOGIN__ + "/credittopupurl";

  /* === Cross service w/o authentication === */

  String GET_ALL_TOURS_BY_API_KEY = "/via/ak/tours";
  //  String HUBSPOT_DATA_FETCH_URL_HOOK = HUBSPOT + "/dfu";
  String APP_SUMO_WEBHOOK = APP_SUMO + "/whk";
  String APP_SUMO_REDIRECT_URL = APP_SUMO + "/redir";
  String ZAPIER_WEBHOOK_REG = ZAPIER + "/reghook";
  String ZAPIER_WEBHOOK_UN_REG = ZAPIER + "/unreghook";
  String ZAPIER_WEBHOOK_SAMPLE = ZAPIER + "/sample_data";
  String HOUSE_LEAD_INFO = "/hldinf";
  String GET_TOUR_ASSET_FILE_PATH = "/trasstpath";
  String POPULATED_LEAD_360 = "/poplead";
  String NEW_LOG = "/new/log";
  String GET_TENANT_INTEGRATION_BY_ID = "/fat/tenant_integration/{id}";
  // INFO although this is named as cobalt event, this event is fable's internal event and is used in multiple areas
  String COBALT_EVENT_PUB = COBALT + "/evnt";
  String FORCE_CREATE_LINKED_ACCOUNT = COBALT + "/forcecreatelinkedaccount";
  //Job related api
  String CREATE_JOB = "/fat/a/job";
  String UPDATE_JOB = "/fat/a/job/{id}";
  String GET_LAST_SUCCESSFUL_JOB = "/fat/a/job/last_success/{type}";
  String LOCK_UNLOCK_DEMOS_IN_ORG = "/lock";
}
