import { IDemoHubConfigDemo, IDemoHubConfigQualification, SelectEntryOption } from '../../types';
import { SelectedDemosForAnEntry } from './type';

export const getDemosFromSelectedOptionsFromQConfig = (
  qConfig: IDemoHubConfigQualification,
  entrySlug: string,
  selectedOptions: SelectEntryOption[]
): SelectedDemosForAnEntry => {
  const demos: IDemoHubConfigDemo[] = [];
  const entry = qConfig.entries.find(item => item.slug === entrySlug);
  const updatedOptions = [];

  if (entry && (entry.type === 'single-select' || entry.type === 'multi-select')) {
    for (const option of entry.options) {
      if (selectedOptions.find(opt => opt.id === option.id)) {
        demos.push(...option.demos);
        updatedOptions.push(option);
      }
    }
  }
  return { entrySlug, options: updatedOptions, demos };
};
