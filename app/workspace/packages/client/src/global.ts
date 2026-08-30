import { AnnotationSerialIdMap } from './component/annotation/ops';
import { P_RespTour } from './entity-processor';

export class Clock {
  private ts: number;

  private timer: ReturnType<typeof setInterval> | null = null;

  private i = 0;

  constructor() {
    this.ts = Date.now();
  }

  triggerEvery = (intervalInSec: number, stopAfter: number, fn: (n: number) => void) => {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (++this.i > stopAfter) this.dispose();
      else fn(this.i * intervalInSec);
    }, intervalInSec * 1000);
  };

  getOffsetInSec(): number {
    return Math.ceil((Date.now() - this.ts) / 1000);
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export interface GlobalSettings {
  shouldLogEvent?: boolean;
}

export interface FableLeadContactProps extends Record<string, string | number | undefined | null | Record<string, any>> {
  pk_key: string;
  pk_val: string
  email?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  industry?: string;
  org?: string;
  phone?: string;
  website_url?: string;
  custom_fields?: Record<string, any>;
}

export interface EventDataOnNav {
  annRefId: string;
  annotationType: 'video' | 'text' | 'leadform' | 'audio' | 'voiceover';
}

export interface GlobalAppData {
  userFromQueryParams?: UserFromQueryParams,
  demo?: P_RespTour,
  journeyData?: JourneyNameIndexData,
  globalClock?: Clock;
  localClocks?: Record<string, Clock>;
  settings?: GlobalSettings;
  lead?: FableLeadContactProps;
  evtDataOnNav?: EventDataOnNav;
  annotationSerialIdMap?: AnnotationSerialIdMap;
  completionPercentage?: number;
  anonymousDemoId?: string;
}

export interface JourneyNameIndexData {
  journeyName?: string | null,
  journeyIndex?: number
}

export type GlobalWin = Window & { __fable_global_app_data__?: GlobalAppData }

export interface UserFromQueryParams extends Record<string, string | number | undefined | null> {
  email?: string;
  first_name?: string;
  last_name?: string;
  org?: string;
  phone?: string;
}

export function addToGlobalAppData<T>(key: keyof GlobalAppData, val: GlobalAppData[keyof GlobalAppData]) : void {
  (window as GlobalWin).__fable_global_app_data__ = {
    ...((window as GlobalWin).__fable_global_app_data__ || {}),
    [key]: val
  };
}

export function getGlobalData(key: keyof GlobalAppData): GlobalAppData[keyof GlobalAppData] {
  const commonMessageData = (window as GlobalWin).__fable_global_app_data__ || {};
  return commonMessageData[key];
}

// A clock that runs from the time demo is loaded for the whole lifecycle of a demo
export function initGlobalClock(): void {
  addToGlobalAppData('globalClock', new Clock());
}

// A local clock that runs for an event of an demo.
// For example: start a clock when an annotation loads
export function initLocalClock(key: string): Clock {
  const clock = new Clock();
  addToGlobalAppData('localClocks', {
    [key]: clock
  });
  return clock;
}
