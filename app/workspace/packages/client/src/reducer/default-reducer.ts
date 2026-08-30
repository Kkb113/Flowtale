import { Action } from 'redux';
import {
  RespAggregateLeadAnalytics,
  RespCommonConfig,
  RespHouseLead,
  RespOrg,
  RespUser
} from '@fable/common/dist/api-contract';
import {
  JourneyData,
  EditFile,
  IAnnotationConfig,
  ITourDataOpts,
  ITourLoaderData,
  LoadingStatus,
  ScreenData,
  TourData,
  IGlobalConfig,
} from '@fable/common/dist/types';
import ActionType from '../action/type';
import {
  TGenericLoading,
  TGetAllScreens,
  TGetAllTours,
  TInitialize,
  TSaveEditChunks,
  TSaveTourEntities,
  TScreen,
  TScreenWithData,
  TTour,
  TTourWithData,
  TIAm,
  TLcOrgId,
  TOrg,
  TOpsInProgress,
  TAddScreenEntities,
  AnnAdd,
  TAutosaving,
  TTourDelete,
  TSubs,
  TGetAllUsers,
  TUserPropChange,
  TTourWithLoader,
  TSaveTourLoader,
  TAutosavingLoader,
  TScreenUpdate,
  TTourPublished,
  TElpath,
  TGetAllUserOrgs,
  TFeaturePlan,
  TCustomDomain,
  TAddCustomDomain,
  TUpdateCustomDomain,
  TRemoveScreenData,
  TSetGlobalConfig,
  TDemoHubLoaded,
  TCreateDemoHubData,
  TDeleteDemoHub,
  TUpdateDemoHub,
  TGetAllDemoHubs,
  TSetDHConfigUploadURL,
  TUpdateDemoHubConfig,
  TSetCurrentDemoData,
  TOrgWideAnalytics,
  P_RespAggregateLeadAnalytics,
  TSaveGlobalEditChunks,
  TAllDatasets,
  TLoadDataset,
  TUpdateDataset,
  TDeleteDataset,
  TUpdateDemoError,
} from '../action/creator';
import { P_RespScreen, P_RespTour, P_RespSubscription, P_RespVanityDomain, P_Dataset } from '../entity-processor';
import { AllEdits, DatasetConfig, EditItem, ElEditType, ElPathKey, GlobalEditFile, IDemoHubConfig, Ops, P_RespDemoHub, UpdateDemoUsingQuillyError } from '../types';
import { FeatureForPlan } from '../plans';

export const initialState: {
  allUserOrgs: RespOrg[] | null;
  inited: boolean;
  commonConfig: RespCommonConfig | null;
  rootScreens: Array<P_RespScreen>;
  allScreens: Array<P_RespScreen>;
  principal: RespUser | null;
  lcOrgId: number | null;
  principalLoadingStatus: LoadingStatus;
  org: RespOrg | null;
  vanityDomains: P_RespVanityDomain[] | null;
  subs: P_RespSubscription | null;
  orgsLoadingStatus: LoadingStatus;
  allScreensLoadingStatus: LoadingStatus;
  allUsersLoadingStatus: LoadingStatus;
  users: Array<RespUser>;
  tours: Array<P_RespTour>;
  allToursLoadingStatus: LoadingStatus;
  screenData: Record<string, ScreenData>;
  screenEdits: Record<string, EditFile<AllEdits<ElEditType>> | null>;
  currentScreen: P_RespScreen | null;
  screenLoadingStatus: LoadingStatus;
  currentTour: P_RespTour | null;
  newTourLoadingStatus: LoadingStatus;
  newScreenLoadingStatus: LoadingStatus;
  tourData: TourData | null;
  tourLoaded: boolean;
  opsInProgress: Ops;
  // TODO remote + local edits in one state for one time consumption
  localEdits: Record<string, EditItem[]>;
  remoteEdits: Record<string, EditItem[]>;
  // TODO remote + local annotation changes in one state for one time consumption
  localAnnotations: Record<string, IAnnotationConfig[]>;
  localAnnotationsIdMap: Record<string, string[]>;
  remoteAnnotations: Record<string, IAnnotationConfig[]>;
  // TODO remote + local opts changes in one state for one time consumption
  remoteTourOpts: ITourDataOpts | null;
  localTourOpts: ITourDataOpts | null;
  tourLoaderData: ITourLoaderData | null;
  token : string;
  relayScreenId: number | null;
  relayAnnAdd: AnnAdd | null;
  isAutoSaving: boolean;
  isAutoSavingLoader: boolean;
  allScreensForCurrentTourLoadingStatus: LoadingStatus;
  journey: JourneyData | null;
  defaultTourLoadingStatus: LoadingStatus;
  elpathKey: ElPathKey;
  featureForPlan: FeatureForPlan | null;
  globalConfig: IGlobalConfig | null;
  demoHubConfig: IDemoHubConfig | null;
  demoHubs: P_RespDemoHub[] | null;
  currentDemoHub: P_RespDemoHub | null;
  currentDemoHubConfig: IDemoHubConfig | null;
  currentDemoHubLoaded: boolean;
  demoHubConfigUploadUrl: string;
  orgWideRespHouseLead: P_RespAggregateLeadAnalytics;
  orgWideRespHouseLeadLoadingStatus: LoadingStatus;
  localGlobalEdits: EditItem[];
  remoteGlobalEdits: EditItem[];
  globalEditFile: GlobalEditFile | null;
  updateDemoUsingAIError: UpdateDemoUsingQuillyError;
  currentDataset: {
    data: P_Dataset,
    config: DatasetConfig,
  } | null;
  datasets: Record<string, P_Dataset> | null;
  datasetConfigs: Record<string, DatasetConfig> | null;
} = {
  allUserOrgs: null,
  inited: false,
  commonConfig: null,
  rootScreens: [],
  allScreens: [],
  allScreensLoadingStatus: LoadingStatus.NotStarted,
  tours: [],
  vanityDomains: null,
  allToursLoadingStatus: LoadingStatus.NotStarted,
  principalLoadingStatus: LoadingStatus.NotStarted,
  orgsLoadingStatus: LoadingStatus.NotStarted,
  principal: null,
  lcOrgId: null,
  org: null,
  subs: null,
  allUsersLoadingStatus: LoadingStatus.NotStarted,
  users: [],
  currentScreen: null,
  screenData: {},
  screenEdits: {},
  screenLoadingStatus: LoadingStatus.NotStarted,
  currentTour: null,
  newTourLoadingStatus: LoadingStatus.NotStarted,
  newScreenLoadingStatus: LoadingStatus.NotStarted,
  tourData: null,
  tourLoaded: false,
  opsInProgress: Ops.None,
  localEdits: {},
  remoteEdits: {},
  localAnnotations: {},
  localAnnotationsIdMap: {},
  remoteAnnotations: {},
  localTourOpts: null,
  remoteTourOpts: null,
  tourLoaderData: null,
  token: '',
  relayScreenId: null,
  relayAnnAdd: null,
  isAutoSaving: false,
  isAutoSavingLoader: false,
  allScreensForCurrentTourLoadingStatus: LoadingStatus.NotStarted,
  journey: null,
  defaultTourLoadingStatus: LoadingStatus.NotStarted,
  elpathKey: 'id',
  featureForPlan: null,
  globalConfig: null,
  demoHubConfig: null,
  demoHubs: null,
  currentDemoHub: null,
  currentDemoHubConfig: null,
  currentDemoHubLoaded: false,
  demoHubConfigUploadUrl: '',
  orgWideRespHouseLead: {
    noOfDemos: 0,
    leads: [],
    leadsByDate: [],
  },
  orgWideRespHouseLeadLoadingStatus: LoadingStatus.NotStarted,
  localGlobalEdits: [],
  remoteGlobalEdits: [],
  globalEditFile: null,
  updateDemoUsingAIError: { hasErr: false, errMsg: '', isSkillNa: false },
  currentDataset: null,
  datasets: null,
  datasetConfigs: null,
};

function replaceScreens(oldScreens: P_RespScreen[], replaceScreen: string, replaceScreenWith: P_RespScreen) {
  const newScreens = oldScreens.slice(0);
  const idx = newScreens.findIndex(screen => screen.rid === replaceScreen);
  if (idx > -1) {
    newScreens[idx] = replaceScreenWith;
    return newScreens;
  }
  return oldScreens;
}

// eslint-disable-next-line default-param-last
export default function projectReducer(state = initialState, action: Action) {
  switch (action.type) {
    case ActionType.INIT: {
      const tAction = action as TInitialize;
      const newState = { ...state };
      newState.commonConfig = tAction.config;
      newState.inited = true;
      return newState;
    }

    case ActionType.ALL_SCREENS_LOADING: {
      const newState = { ...state };
      newState.allScreensLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ALL_SCREENS_LOADED: {
      const tAction = action as TGetAllScreens;
      const newState = { ...state };
      if (tAction.resetFromLocalState) {
        newState.rootScreens = state.rootScreens.slice(0);
        newState.allScreensLoadingStatus = LoadingStatus.Done;
      } else {
        newState.rootScreens = tAction.rootScreens;
        newState.allScreensLoadingStatus = LoadingStatus.Done;
      }
      return newState;
    }

    case ActionType.USER_LOADING: {
      const newState = { ...state };
      newState.principalLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.IAM: {
      const tAction = action as TIAm;
      const newState = { ...state };
      newState.principalLoadingStatus = LoadingStatus.Done;
      newState.principal = tAction.user;
      return newState;
    }

    case ActionType.LC_ORG_ID: {
      const tAction = action as TLcOrgId;
      const newState = { ...state };
      newState.lcOrgId = tAction.orgId;
      return newState;
    }

    case ActionType.ALL_USER_ORGS_LOADED: {
      const tAction = action as TGetAllUserOrgs;
      const newState = { ...state };
      newState.allUserOrgs = tAction.orgs;
      return newState;
    }

    case ActionType.ORG_LOADING: {
      const newState = { ...state };
      newState.orgsLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ORG: {
      const tAction = action as TOrg;
      const newState = { ...state };
      newState.org = tAction.org;
      newState.orgsLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.GET_CUSTOM_DOMAINS: {
      const tAction = action as TCustomDomain;
      const newState = { ...state };
      newState.vanityDomains = tAction.vanityDomains;
      return newState;
    }

    case ActionType.ADD_CUSTOM_DOMAIN: {
      const tAction = action as TAddCustomDomain;
      const newState = { ...state };
      newState.vanityDomains = (newState.vanityDomains || []).concat(tAction.vanityDomain);
      return newState;
    }

    case ActionType.SET_CUSTOM_DOMAIN: {
      const tAction = action as TUpdateCustomDomain;
      const newState = { ...state };
      if (!newState.vanityDomains) return newState;

      const idx = newState.vanityDomains.findIndex(d => d.domainName === tAction.domain.domainName);
      if (idx >= 0) {
        newState.vanityDomains = newState.vanityDomains.slice(0, idx).concat(
          tAction.domain,
          newState.vanityDomains.slice(idx + 1)
        );
      }
      return newState;
    }

    case ActionType.SET_GLOBAL_CONFIG: {
      const tAction = action as TSetGlobalConfig;
      const newState = { ...state };
      newState.globalConfig = tAction.globalConfig;
      return newState;
    }

    case ActionType.SUBS: {
      const tAction = action as TSubs;
      const newState = { ...state };
      newState.subs = tAction.subs;
      return newState;
    }

    case ActionType.ALL_USERS_FOR_ORG_LOADING: {
      const newState = { ...state };
      newState.allUsersLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ALL_USERS_FOR_ORG_LOADED: {
      const tAction = action as TGetAllUsers;
      const newState = { ...state };
      newState.users = tAction.users;
      newState.allUsersLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.USER_UPDATED: {
      const tAction = action as TUserPropChange;
      const newState = { ...state };
      const newUsers = newState.users.map(u => {
        if (u.id === tAction.user.id) return tAction.user;
        return u;
      });
      newState.users = newUsers;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADING: {
      const newState = { ...state };
      newState.allToursLoadingStatus = LoadingStatus.InProgress;
      newState.currentTour = null;
      newState.tourLoaded = false;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADED: {
      const tAction = action as TGetAllTours;
      const newState = { ...state };
      newState.tours = tAction.tours;
      newState.globalConfig = tAction.globalConfig;
      newState.allToursLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.AUTOSAVING: {
      const tAction = action as TAutosaving;
      const newState = { ...state };
      newState.isAutoSaving = tAction.isAutosaving;
      return newState;
    }

    case ActionType.AUTOSAVING_LOADER: {
      const tAction = action as TAutosavingLoader;
      const newState = { ...state };
      newState.isAutoSavingLoader = tAction.isAutosavingLoader;
      return newState;
    }

    case ActionType.OPS_IN_PROGRESS: {
      const tAction = action as TOpsInProgress;
      const newState = { ...state };
      newState.opsInProgress = tAction.ops;
      return newState;
    }

    case ActionType.TOUR: {
      const tAction = action as TTour;
      const newState = { ...state };

      newState.currentTour = tAction.tour;
      if (tAction.performedAction === 'new') {
        newState.newTourLoadingStatus = LoadingStatus.Done;
        const tours = newState.tours.slice(0);
        tours.unshift(tAction.tour);
        newState.tours = tours;
      } else if (tAction.performedAction === 'rename') {
        const tours = newState.tours.slice(0);
        const index = tours.findIndex(tour => tour.rid === tAction.oldTourRid);
        if (index !== -1) {
          tours.splice(index, 1);
        }
        tours.unshift(tAction.tour);
        newState.tours = tours;
      } else if (tAction.performedAction === 'publish' || tAction.performedAction === 'edit') {
        const updatedTour = {
          ...tAction.tour,
          screens: state.currentTour?.screens?.slice(0)
        };
        newState.currentTour = updatedTour;
        newState.tours = state.tours.map(tour => (tour.rid === updatedTour.rid ? updatedTour : tour));
      }
      newState.opsInProgress = Ops.None;
      return newState;
    }

    case ActionType.DELETE_TOUR: {
      const tAction = action as TTourDelete;
      const newState = { ...state };
      newState.tours = newState.tours.filter(tour => tour.rid !== tAction.ridOfTourToBeDeleted);
      return newState;
    }

    case ActionType.SCREEN: {
      const tAction = action as TScreen;
      const newState = { ...state };
      newState.currentScreen = tAction.screen;
      if (tAction.performedAction === 'new') newState.newScreenLoadingStatus = LoadingStatus.Done;
      if (tAction.performedAction === 'rename' && tAction.prevScreenRid) {
        newState.allScreens = replaceScreens(newState.allScreens, tAction.prevScreenRid, tAction.screen);
        if (newState.currentTour?.screens && newState.currentTour?.screens.length) {
          newState.currentTour.screens = replaceScreens(newState.currentTour.screens, tAction.prevScreenRid, tAction.screen);
        }
      }
      return newState;
    }

    case ActionType.SCREEN_UPDATE: {
      const tAction = action as TScreenUpdate;
      const newState = { ...state };

      newState.allScreens = replaceScreens(newState.allScreens, tAction.updatedScreen.rid, tAction.updatedScreen);

      if (newState.currentTour && newState.currentTour.screens && newState.currentTour.screens.length) {
        newState.currentTour.screens = replaceScreens(
          newState.currentTour.screens,
          tAction.updatedScreen.rid,
          tAction.updatedScreen
        );
      }

      if (newState.currentScreen && newState.currentScreen.rid === tAction.updatedScreen.rid) {
        newState.currentScreen = tAction.updatedScreen;
      }

      return newState;
    }

    case ActionType.SCREEN_LOADING: {
      const newState = { ...state };
      newState.screenLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.CLEAR_CURRENT_SCREEN: {
      const newState = { ...state };
      newState.currentScreen = null;
      newState.screenLoadingStatus = LoadingStatus.NotStarted;
      return newState;
    }

    case ActionType.TOUR_LOADING: {
      const newState = { ...state };
      newState.tourLoaded = false;
      return newState;
    }

    case ActionType.CLEAR_CURRENT_TOUR: {
      const newState = { ...state };
      newState.currentTour = null;
      newState.tourData = null;
      newState.remoteTourOpts = null;
      newState.remoteAnnotations = {};
      newState.tourLoaderData = null;
      newState.tourLoaded = false;
      newState.allScreens = [];
      newState.newTourLoadingStatus = LoadingStatus.NotStarted;
      return newState;
    }

    case ActionType.SCREEN_AND_DATA_LOADED: {
      const tAction = action as TScreenWithData;
      const newState = { ...state };
      if (!tAction.preloading) {
        // If a screen is being preloaded then don't change the current screen and loading status
        newState.currentScreen = tAction.screen;
        newState.screenLoadingStatus = LoadingStatus.Done;
      }
      newState.screenData = {
        ...newState.screenData,
        [tAction.screen.id]: tAction.screenData,
      };
      newState.screenEdits = {
        ...newState.screenEdits,
        [tAction.screen.id]: tAction.screenEdits,
      };
      newState.remoteEdits = {
        ...newState.remoteEdits,
        [tAction.screen.id]: tAction.remoteEdits
      };
      return newState;
    }

    case ActionType.TOUR_AND_LOADER_LOADED: {
      const tAction = action as TTourWithLoader;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.tourLoaderData = tAction.loader;
      newState.globalConfig = tAction.globalConfig;
      return newState;
    }

    case ActionType.TOUR_AND_DATA_LOADED: {
      const tAction = action as TTourWithData;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.tourData = tAction.tourData;
      newState.remoteAnnotations = tAction.annotations;
      newState.remoteTourOpts = tAction.opts;
      newState.tourLoaded = true;
      newState.journey = tAction.journey;
      newState.globalConfig = tAction.globalConfig;
      newState.globalEditFile = tAction.editData;
      newState.remoteGlobalEdits = tAction.globalEdits;

      if (tAction.allCorrespondingScreens && tAction.tour.screens) {
        newState.allScreens = tAction.tour.screens;
      }
      return newState;
    }

    case ActionType.GENERIC_LOADING: {
      const tAction = action as TGenericLoading;
      const newState = { ...state };
      return newState;
    }

    case ActionType.SAVE_EDIT_CHUNKS: {
      const tAction = action as TSaveEditChunks;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localEdits[tAction.screenId] = [...tAction.editList];
      } else {
        newState.remoteEdits[tAction.screenId] = [...tAction.editList];
        newState.localEdits[tAction.screenId] = [];
        newState.screenEdits[tAction.screenId] = tAction.editFile!;
      }
      return newState;
    }

    case ActionType.SAVE_GLOBAL_EDIT_CHUNKS: {
      const tAction = action as TSaveGlobalEditChunks;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localGlobalEdits = [...tAction.editList];
      } else {
        newState.localGlobalEdits = [...tAction.editList];
        newState.remoteGlobalEdits = [...tAction.editList];
        newState.globalEditFile = tAction.editFile!;
      }
      return newState;
    }

    case ActionType.SAVE_TOUR_ENTITIES: {
      const tAction = action as TSaveTourEntities;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localTourOpts = tAction.opts;
        newState.localAnnotations = tAction.annotations;
        newState.localAnnotationsIdMap = tAction.idMap;
        newState.journey = tAction.journey;
      } else {
        newState.localTourOpts = null;
        newState.localAnnotations = {};
        newState.localAnnotationsIdMap = {};
        newState.remoteAnnotations = tAction.annotations;
        newState.remoteTourOpts = tAction.opts;
        newState.tourData = tAction.data;
        newState.journey = tAction.journey;
      }
      return newState;
    }

    case ActionType.SAVE_TOUR_LOADER: {
      const tAction = action as TSaveTourLoader;
      const newState = { ...state };
      newState.tourLoaderData = tAction.loader;
      newState.isAutoSavingLoader = false;
      return newState;
    }

    case ActionType.SAVE_TOUR_RELAY_ENTITIES: {
      const tAction = action as TAddScreenEntities;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.allScreens = tAction.tour.screens || [];
      newState.relayScreenId = tAction.screenId;
      newState.relayAnnAdd = tAction.annAdd;
      return newState;
    }

    case ActionType.CLEAR_RELAY_SCREEN_ANN_ADD: {
      const newState = { ...state };
      newState.relayScreenId = null;
      newState.relayAnnAdd = null;
      return newState;
    }

    case ActionType.DEFAULT_TOUR_LOADED: {
      const newState = { ...state };
      newState.defaultTourLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.TOUR_LOADED: {
      const tAction = action as TTourPublished;
      const newState = { ...state };
      newState.currentTour = tAction.tour;

      return newState;
    }

    case ActionType.UPDATE_ELPATH: {
      const tAction = action as TElpath;
      const newState = { ...state };
      newState.elpathKey = tAction.elPath;

      return newState;
    }

    case ActionType.SET_FEATURE_FOR_PLAN: {
      const tAction = action as TFeaturePlan;
      const newState = { ...state };
      newState.featureForPlan = tAction.featureForPlan;

      return newState;
    }

    case ActionType.REMOVE_SCREEN_DATA: {
      const tAction = action as TRemoveScreenData;
      const newState = { ...state };
      newState.screenData = tAction.allScreenData;

      return newState;
    }

    case ActionType.DEMOHUB_LOADED: {
      const tAction = action as TDemoHubLoaded;
      const newState = { ...state };
      newState.currentDemoHub = tAction.data;
      newState.currentDemoHubConfig = tAction.config;
      newState.currentDemoHubLoaded = true;
      return newState;
    }

    case ActionType.CLEAR_CURRENT_DEMOHUB: {
      const newState = { ...state };
      newState.currentDemoHub = null;
      newState.currentDemoHubConfig = null;
      newState.currentDemoHubLoaded = false;
      return newState;
    }

    case ActionType.CREATE_DEMOHUB_DATA: {
      const tAction = action as TCreateDemoHubData;
      const newState = { ...state };
      if (newState.demoHubs) {
        newState.demoHubs = [...newState.demoHubs, tAction.demoHub];
      }
      return newState;
    }

    case ActionType.DELETE_DEMOHUB_DATA: {
      const tAction = action as TDeleteDemoHub;
      const newState = { ...state };
      if (newState.demoHubs) {
        newState.demoHubs = newState.demoHubs.filter(dh => dh.rid !== tAction.rid);
      }
      return newState;
    }

    case ActionType.UPDATE_DEMOHUB_DATA: {
      const tAction = action as TUpdateDemoHub;
      const newState = { ...state };
      if (newState.demoHubs) {
        newState.demoHubs = newState.demoHubs.map(dh => {
          if (dh.id === tAction.data.id) {
            return tAction.data;
          }
          return dh;
        });
      }
      if (newState.currentDemoHub?.id === tAction.data.id) {
        newState.currentDemoHub = { ...tAction.data };
      }
      return newState;
    }

    case ActionType.SET_ALL_DEMOHUBS: {
      const tAction = action as TGetAllDemoHubs;
      const newState = { ...state };
      newState.demoHubs = tAction.demoHubs;
      return newState;
    }

    case ActionType.SET_DH_CONFIG_UPLOAD_URL: {
      const tAction = action as TSetDHConfigUploadURL;
      const newState = { ...state };
      newState.demoHubConfigUploadUrl = tAction.url;
      return newState;
    }

    case ActionType.SET_CURRENT_DEMOHUB_CONFIG: {
      const tAction = action as TUpdateDemoHubConfig;
      const newState = { ...state };
      newState.currentDemoHubConfig = tAction.config;
      return newState;
    }

    case ActionType.SET_CURRENT_DEMOHUB_DATA: {
      const tAction = action as TSetCurrentDemoData;
      const newState = { ...state };
      newState.currentDemoHub = tAction.data;
      newState.isAutoSaving = false;
      return newState;
    }

    case ActionType.ORG_WIDE_ANALYTICS_LOADING: {
      const newState = { ...state };
      newState.orgWideRespHouseLeadLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ORG_WIDE_ANALYTICS: {
      const tAction = action as TOrgWideAnalytics;
      const newState = { ...state };
      newState.orgWideRespHouseLead = tAction.data;
      newState.orgWideRespHouseLeadLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.ALL_DATASETS_LOADED: {
      const tAction = action as TAllDatasets;
      const newState = { ...state };
      newState.datasets = tAction.datasets.reduce((acc, dataItem) => {
        acc[dataItem.name] = dataItem;
        return acc;
      }, {} as Record<string, P_Dataset>);
      return newState;
    }

    case ActionType.LOAD_DATASET: {
      const tAction = action as TLoadDataset;
      const newState = { ...state };
      newState.datasetConfigs = {
        ...(newState.datasetConfigs || {}),
        ...tAction.configs,
      };
      newState.datasets = {
        ...(newState.datasets || {}),
        ...tAction.datasetsData,
      };
      return newState;
    }

    case ActionType.UPDATE_DATASET: {
      const tAction = action as TUpdateDataset;
      const newState = { ...state };
      if (!newState.datasets) newState.datasets = {};
      newState.datasets = { ...newState.datasets };
      newState.datasets[tAction.dataset.name] = tAction.dataset;
      return newState;
    }

    case ActionType.DELETE_DATASET: {
      const tAction = action as TDeleteDataset;
      const newState = { ...state };
      if (newState.datasets) {
        newState.datasets = { ...newState.datasets };
        delete newState.datasets[tAction.datasetName];
      }
      if (newState.datasetConfigs) {
        newState.datasetConfigs = { ...newState.datasetConfigs };
        delete newState.datasetConfigs[tAction.datasetName];
      }
      return newState;
    }

    case ActionType.UPDATE_DEMO_USING_LLM_ERROR: {
      const tAction = action as TUpdateDemoError;
      const newState = { ...state };
      newState.updateDemoUsingAIError = {
        hasErr: tAction.err.hasErr,
        errMsg: tAction.err.errMsg,
        isSkillNa: tAction.err.isSkillNa
      };

      return newState;
    }

    default:
      return state;
  }
}
