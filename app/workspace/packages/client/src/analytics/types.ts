import { IAnnotationButtonType } from '@fable/common/dist/types';
// import { CmnLeadProps, FableLeadContactProps } from '../global';
// TODO[now] check what all props are needed here

export enum FableAnalyticsLocalStoreKeys {
  AnonymousUserId = 'fable/aid',
  SessionId = 'fable/sid',
  SessionIdExpireAt = 'fable/side'
}

export interface CommonEventProps {
  aid: string;
  sid?: string;
  uts: number;
  tz: string;
}

// INFO events should always be in lowercase and cased & separated like following
export enum AnalyticsEvents {
  ANN_BTN_CLICKED = 'ann_btn_clicked',
  ANN_USER_ASSIGN = 'ann_user_assign',
  TIME_SPENT_IN_ANN = 'time_spent_in_ann',
  VIDEO_ANN_SKIPPED = 'video_ann_skipped'
}

// @Deprecated
export enum AnalyticsEventsDirect {
  CTA_CLICKED = 'cta_clicked'
}

export interface AnnotationBtnClickedPayload {
  tour_id: number;
  ann_id: string;
  btn_type: IAnnotationButtonType | CtaFrom;
  btn_id: string;
}

export interface TimeSpentInAnnotationPayload {
  tour_id: number;
  ann_id: string;
  time_in_sec: number
}

export interface VideoAnnotationSkippedPayload {
  tour_id: number;
  ann_id: string;
  time_in_sec_played: number
}

export interface UserAssignPayload {
  user_email: string;
  tour_id: number;
  others: Record<string, string | number | undefined | null>;
}

export interface CtaClickedInternal {
  ctaFrom: CtaFrom;
  btnId?: string;
  url: string;
  btnTxt: string;
}

export interface CtaClickedAnalytics {
  ctaFrom: CtaFrom;
  btnId: string;
  url: string;
  tourId: number;
}

export enum CtaFrom {
  Annotation = 'ann-btn',
  Module = 'module-cta',
  SiteHeader = 'site-header-cta',
}

export interface PayloadTypeMap {
  [AnalyticsEvents.ANN_BTN_CLICKED]: AnnotationBtnClickedPayload;
  [AnalyticsEvents.ANN_USER_ASSIGN]: UserAssignPayload;
  [AnalyticsEvents.TIME_SPENT_IN_ANN]: TimeSpentInAnnotationPayload;
  [AnalyticsEvents.VIDEO_ANN_SKIPPED]: VideoAnnotationSkippedPayload;
}

export interface EventLog {
  payload: AnnotationBtnClickedPayload | TimeSpentInAnnotationPayload | VideoAnnotationSkippedPayload | UserAssignPayload;
  aid: string;
  sid?: string;
  uts: number;
  tz: string;
  event: AnalyticsEvents;
}

// @Deprecated
export interface EventLogDirect extends CtaClickedAnalytics {
  email: string;
  aid: string;
  sid?: string;
  uts: number;
  tz: string;
  event: AnalyticsEventsDirect;
}

export interface FlattendEventLog extends Record<string, number | string | undefined | object>{
  aid: string;
  sid?: string;
  payload_others?: object;
  uts: number;
  tz: string;
  event: AnalyticsEvents;
}
