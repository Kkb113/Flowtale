import { createContext, useContext } from 'react';
import { IDemoHubConfig, } from '../../types';
import { QualificationConfig, QualificationStep, SelectedDemosForAnEntry, StepInfo } from './type';

interface DemHubQlfcnCtxProps {
  config: IDemoHubConfig;
  qualificationConfig: QualificationConfig | null;
  selectedDemosForEntries: Record<string, SelectedDemosForAnEntry>;
  setSelectedDemosForEntries: React.Dispatch<React.SetStateAction<Record<string, SelectedDemosForAnEntry>>>;
  orderOfSteps: QualificationStep[];
  // the string will be stepSlug or `stepSlug#demoSlug`
  stepInfoMap: Record<string, StepInfo>,
  setStepInfoMap: React.Dispatch<React.SetStateAction<Record<string, StepInfo>>>,
  navigateToStep: (stepSlug: string, demoRid?: string) => void;
  setLeadFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  leadFormValues: Record<string, any>;
  demoParams: Record<string, any>;
}

export const DemoHubQlfcnCtx = createContext<DemHubQlfcnCtxProps | null >(null);

export const useDemoHubQlfcnCtx = (): DemHubQlfcnCtxProps => {
  const context = useContext(DemoHubQlfcnCtx);
  if (!context) {
    throw new Error('useEditorCtx must be used within a EditorCtx.Provider');
  }
  return context;
};
