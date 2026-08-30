import { P_RespTour } from '../../entity-processor';
import { IDemoHubConfig, IDemoHubConfigCta } from '../../types';

export const getTourByRid = (allTours: P_RespTour[], rid: string): P_RespTour | undefined => {
  const res = allTours.find(tour => tour.rid === rid);
  return res;
};

export const getCtaById = (
  demoHubConfig: IDemoHubConfig,
  ctaId: string
): IDemoHubConfigCta | undefined => {
  const res = demoHubConfig.cta.find(cta => cta.id === ctaId);
  return res;
};

export const getEntryTypeTitle = (type: 'single-select' | 'multi-select' | 'text-entry' | 'leadform-entry'): string => {
  switch (type) {
    case 'leadform-entry':
      return 'Leadform entry';
    case 'multi-select':
      return 'Multiselect entry';
    case 'single-select':
      return 'Single entry';
    case 'text-entry':
      return 'Text entry';
    default:
      return '';
  }
};

export function stringToSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getNewIndex = (currentArray: string[], text: string): number => {
  const result: number[] = [];
  const escapedText = escapeRegExp(text);
  const regex = new RegExp(`^${escapedText} (\\d+)$`);

  for (const item of currentArray) {
    const match = item.match(regex);
    if (match && match[1]) {
      result.push(parseInt(match[1], 10));
    }
  }

  return Math.max(...result, 0);
};
