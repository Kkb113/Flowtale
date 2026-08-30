import { Plan } from '@fable/common/dist/api-contract';

export enum Test {
  TEXTARR = 'text',
  COUNT = 'count',
  SWITCH = 'switch'
}

export interface PlanDetail {
  test: Test,
  value: string | string[],
  plan: Plan | '*'
}

export interface FeaturePlan {
  plans: PlanDetail[],
  isInBeta: boolean,
  requireAccess: boolean
}

export interface FeaturePerPlan {
  [key: string]: FeaturePlan
}

export const AnalyticsValue = ['advanced', 'basic'];
export type IntegrationValue = 'hubspot'
export const AnnotationValue = ['text', 'video', 'audio'];

export interface PlanDetailWithBeta extends PlanDetail {
  isInBeta: boolean,
  requireAccess: boolean
}

export interface FeatureForPlan {
  [key: string]: PlanDetailWithBeta
}
