import api from '@fable/common/dist/api';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import { GlobalSettings, getGlobalData } from '../global';

export interface CBEventBase{
  ti: number;
}

export interface CBEventPayload<T extends CBEventBase> {
    event: string;
    payload: T;
}

export interface CBCtaClickEvent extends CBEventBase {
  leadStrEncoded: string;
  pk_key: string;
  pk_val: string;
  anon: boolean;
  source: string;
  cta_url: string;
  cta_txt: string;
  our_event_id: string;
}

export interface CBDemoOpened extends CBEventBase {
  leadStrEncoded: string;
  anon: boolean;
}

export interface CBLeadFormFilledEvent extends CBEventBase {
  leadStrEncoded: string
}

export function logEventToCblt<T extends CBEventBase>(event: CBEventPayload<T>, rid: string): void {
  try {
    const globalSettings = getGlobalData('settings') as GlobalSettings;
    if (!globalSettings.shouldLogEvent) return;
    api(`/vr/ct/evnt?rid=${rid}`, {
      auth: false,
      method: 'POST',
      body: event,
      noRespExpected: true,
    });
  } catch (err) {
    sentryCaptureException(err as Error);
  }
}

export function logEventToCbltToSetAppProperties<T extends CBEventBase>(event: CBEventPayload<T>): void {
  try {
    api('/vr/ct/evnt', {
      auth: true,
      method: 'POST',
      body: event,
      noRespExpected: true,
    });
  } catch (err) {
    sentryCaptureException(err as Error);
  }
}

// INFO these are cobalt events and needs to be sycned with that list
export enum CBEvents {
  // legacy events
  CREATE_CONTACT = 'CREATE_OR_UPDATE_CONTACT',
  CTA_CLICKED_LEAGACY = 'CTA_CLICKED',
  CREATE_CONTACT_PROPERTIES_AND_GROUP = 'CREATE_CONTACT_PROPERTIES_AND_GROUP',

  // new events
  DEMO_OPENED = 'DEMO_OPENED',
  LEAD_FORM_FILLED = 'LEAD_FORM_FILLED',
  CTA_CLICKED = 'CTA_CLICKED_2'
}
