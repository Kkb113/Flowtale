// Analytics v2 events
// After the migration is done, rename all events as if these are primay events

import api from '@fable/common/dist/api';
import { ClientLogClass } from '@fable/common/dist/api-contract';
import { Clock, GlobalSettings, getGlobalData } from '../global';
import { getAnonymousUserId, getSessionId, getTimezoneOffset, getUtcUnixTimestamp } from './utils';
import { P_RespTour } from '../entity-processor';

// analytics v2 events
// ref https://github.com/sharefable/api/wiki/Analytics#frontend-events

// AAE -> App Analytics Event
type AppAnalyticsEvents = 'demo_opened'
  | 'user_assign'
  | 'nav_to_ann'
  | 'time_spent_in_ann'
  | 'cta_clicked'
  | 'completion';

export interface CommonEventParams {
  aid: string;
  sid: string;
  evtt: number;
  tz: string;
  eni: number;
  ent: number;
  enc: 'ac' | 'acdt';
  offset: number;
  payload: Record<string, string | number | undefined | null>;
  event: AppAnalyticsEvents;
}

// AAE -> App Analytics Event
// in contrast with product events / internal events

export interface AAE_TourOpened extends CommonEventParams {
  event: 'demo_opened';
  enc: 'ac';
}

interface UserAssignPayload extends Record<string, string | number | undefined | null> {
  pk_val: string;
  pk_field: string;
}

export interface AAE_UserAssign extends CommonEventParams {
  event: 'user_assign';
  enc: 'ac';
  payload: UserAssignPayload
}

export interface AAE_NavToAnn extends CommonEventParams {
  event: 'nav_to_ann';
  enc: 'ac';
  payload: {
    annId: string;
    annType: 'video' | 'text' | 'leadform' | 'audio'
  }
}

export interface AAE_CtaClicked extends CommonEventParams {
  event: 'cta_clicked';
  enc: 'ac';
  payload: {
    source: 'ann-btn' | 'module-cta' | 'site-header-cta' | 'demo-hub';
    btnId?: string;
    btnText: string;
    url: string;
  }
}

export interface AAE_TimeSpentInAnn extends CommonEventParams {
  event: 'time_spent_in_ann';
  enc: 'acdt';
  payload: {
    annId: string;
    annType: 'video' | 'text' | 'leadform' | 'audio'
  }
}

export interface AAE_Completion extends CommonEventParams {
  event: 'completion';
  enc: 'acdt';
  payload: {}
}

function getCommonEventParams(): Omit<CommonEventParams, 'payload' | 'enc' | 'offset' | 'event'> {
  const date = new Date();
  const tour = getGlobalData('demo') as P_RespTour;
  return {
    aid: getAnonymousUserId(),
    sid: getSessionId(),
    evtt: getUtcUnixTimestamp(date),
    tz: getTimezoneOffset(date),
    eni: tour.id,
    ent: tour.entityType
  };
}

function getSpecificEventParams(
  event: AppAnalyticsEvents,
  payload: Record<string, string | number | undefined | null>,
  metrics?: {
    offset: number
  }
): Pick<CommonEventParams, 'enc' | 'offset' | 'payload'> {
  const globalClock = getGlobalData('globalClock') as Clock;
  switch (event) {
    case 'demo_opened':
    case 'user_assign':
    case 'nav_to_ann':
    case 'cta_clicked': {
      return {
        enc: 'ac',
        offset: globalClock.getOffsetInSec(),
        payload,
      };
    }

    case 'time_spent_in_ann':
    case 'completion': {
      return {
        enc: 'acdt',
        offset: metrics!.offset,
        payload,
      };
    }

    default:
      throw new Error('Unknown event', event);
  }
}

export const eventAndLogClassAssociation: Record<ClientLogClass, Partial<Record<AppAnalyticsEvents, number>>> = {
  [ClientLogClass.Basic]: {
    demo_opened: 1,
    cta_clicked: 1,
    user_assign: 1
  },
  [ClientLogClass.Full]: {
    demo_opened: 1,
    cta_clicked: 1,
    user_assign: 1,
    nav_to_ann: 1,
    time_spent_in_ann: 1,
    completion: 1,
  },
  [ClientLogClass.na]: { }
};

export const logEvent = (
  eventName: AppAnalyticsEvents,
  payload?: Partial<CommonEventParams['payload']>,
  metric?: { offset: number }
): void => {
  const globalSettings = getGlobalData('settings') as GlobalSettings;
  if (!globalSettings.shouldLogEvent) return;

  let eventObj: CommonEventParams = {
    event: eventName,
    ...getCommonEventParams(),
    ...getSpecificEventParams(eventName, payload || {}, metric),
  };

  const tour = getGlobalData('demo') as P_RespTour | null;
  if (!tour) throw new Error('Assertion error. No demo present');

  if (tour.logClass && eventAndLogClassAssociation[tour.logClass][eventName] !== 1) {
    console.debug('Event dropped', `[log class ${tour.logClass}]`, eventObj);
    return;
  }

  if (eventName === 'user_assign') {
    // port event for la
    const portedEvent = {
      ...eventObj,
      payload: {
        ...eventObj.payload
      }
    };
    const pkKey = portedEvent.payload.pk_key;
    portedEvent.payload.pk_field = pkKey;
    delete portedEvent.payload.pk_key;
    eventObj = portedEvent;
  }

  api('/la', {
    body: {
      logs: [eventObj]
    },
    auth: false,
    noRespExpected: true,
    isLogEndpoint: true
  });
};
