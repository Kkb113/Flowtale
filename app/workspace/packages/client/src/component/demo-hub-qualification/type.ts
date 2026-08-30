import { IDemoHubConfig, LeadFormEntry, SelectEntry, TextEntry } from '../../types';

export type QualificationConfig = IDemoHubConfig['qualification_page']['qualifications'][0];

export interface SelectedDemosForAnEntry {
  entrySlug: string,
  options: SelectEntry['options'],
  demos: SelectEntry['options'][0]['demos']
}

export interface StepInfo {
  done: boolean,
  skipped: boolean,
  disabled: boolean,
}

export interface SelectStep extends SelectEntry {
  demoData: SelectEntry['options'][0]['demos'][0] | null,
}

export type QualificationStep = TextEntry | LeadFormEntry | SelectStep;

export interface SidepanelLinkItem {
  title: string;
  slug: string;
  id: string;
}

export interface SidepanelLinks extends SidepanelLinkItem {
  substeps: SidepanelLinkItem[],
}

export interface EntryProps {
  entryData: TextEntry | SelectEntry | LeadFormEntry;
  isVisible: boolean;
  goToNext: (demoRid?: string) => void;
  onSkip: () => void;
  isLast: boolean;
}

export const getStepKey = (step: QualificationStep): string => {
  if (step.type === 'leadform-entry' || step.type === 'text-entry') return step.slug;
  if (!step.demoData) return step.slug;
  return `${step.slug}**${step.demoData.rid}`;
};
