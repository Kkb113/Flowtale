import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IDemoHubConfig } from '../../types';
import { DemoHubQlfcnCtx } from './ctx';
import Header from './header';
import Sidepanel from './sidepanel';
import { QualificationConfig, QualificationStep, SelectStep, SelectedDemosForAnEntry,
  SidepanelLinkItem, SidepanelLinks, StepInfo,
  getStepKey } from './type';
import TextEntry from './entry/text-entry';
import LeadFormEntry from './entry/leadform-entry';
import SelectEntry from './entry/select-entry';
import * as Tags from './styled';
import DemoEntry from './entry/demo-entry';
import { getorCreateDemoHubScriptEl, getOrCreateDemoHubStyleEl } from '../../utils';
import { addFontToHeader } from '../demo-hub-see-all';
import { getDemosFromSelectedOptionsFromQConfig } from './utils';

interface Props {
  config: IDemoHubConfig;
  qualificationSlug: string;
  stepSlug: string | null;
  demoRid: string | null;
  navigateToStep: (stepSlug: string, demoRid?: string) => void;
  demoParams: Record<string, any>;
}

function DemoHubQualification(props: Props): JSX.Element {
  const [selectedDemosForEntries, setSelectedDemosForEntries] = useState<Record<string, SelectedDemosForAnEntry>>({});
  const [qualificationConfig, setQualificationConfig] = useState<QualificationConfig | null>(null);
  const [orderOfSteps, setOrderOfSteps] = useState<QualificationStep[]>([]);
  const [stepInfoMap, setStepInfoMap] = useState<Record<string, StepInfo>>({});
  const [sidepanelLinks, setSidepanelLinks] = useState<SidepanelLinks[]>([]);
  const [leadFormValues, setLeadFormValues] = useState<Record<string, any>>({});
  const rootSheet = useRef<HTMLStyleElement | null>(null);
  const subSheet = useRef<HTMLStyleElement | null>(null);

  const ctxValue = useMemo(
    () => ({
      config: props.config,
      qualificationConfig,
      selectedDemosForEntries,
      setSelectedDemosForEntries,
      orderOfSteps,
      stepInfoMap,
      setStepInfoMap,
      navigateToStep: props.navigateToStep,
      leadFormValues,
      setLeadFormValues,
      demoParams: props.demoParams,
    }),
    [props.config, orderOfSteps, stepInfoMap, selectedDemosForEntries, qualificationConfig,
      setSelectedDemosForEntries, setStepInfoMap, props.navigateToStep, leadFormValues, setLeadFormValues,
      props.demoParams]
  );

  useEffect(() => {
    const res = calculateOrderOfStepsAndSidepanelLinks();
    setOrderOfSteps(res.order);
    setSidepanelLinks(res.sidepanelLinks);
  }, [qualificationConfig, selectedDemosForEntries]);

  useEffect(() => {
    setQualificationConfig(
      props.config.qualification_page.qualifications
        .find(q => q.slug === props.qualificationSlug)
      || null
    );
  }, [props.config]);

  useEffect(() => {
    if (!qualificationConfig) return;

    setSelectedDemosForEntries(prev => {
      const newState = { ...prev };
      Object.entries(newState).forEach(([entrySlug, data]) => {
        const newData = getDemosFromSelectedOptionsFromQConfig(qualificationConfig, entrySlug, data.options);
        newState[entrySlug] = newData;
      });
      return newState;
    });
  }, [qualificationConfig]);

  const calculateOrderOfStepsAndSidepanelLinks = (): {
    order: QualificationStep[],
    sidepanelLinks: SidepanelLinks[],
  } => {
    const order: QualificationStep[] = [];
    const sidepanelLinksArr: SidepanelLinks[] = [];

    qualificationConfig?.entries.forEach(entry => {
      if (entry.type === 'text-entry' || entry.type === 'leadform-entry') {
        order.push(entry);
        sidepanelLinksArr.push({
          title: entry.title,
          slug: entry.slug,
          substeps: [],
          id: entry.id,
        });
        return;
      }

      order.push({
        ...entry,
        demoData: null,
      });

      const substeps: SidepanelLinkItem[] = [];
      const selectedDemosForEntry = (Object.values(selectedDemosForEntries))
        .find(item => item.entrySlug === entry.slug);
      selectedDemosForEntry?.demos.forEach(demo => {
        order.push({
          ...entry,
          demoData: demo,
        });
        substeps.push({
          title: demo.name,
          slug: demo.rid,
          id: demo.rid,
        });
      });
      sidepanelLinksArr.push({
        title: entry.title,
        slug: entry.slug,
        substeps,
        id: entry.id,
      });
    });
    return { order, sidepanelLinks: sidepanelLinksArr };
  };

  const isCurrentActiveStep = (step: QualificationStep): boolean => {
    const isSlugSame = step.slug === props.stepSlug;

    if (props.demoRid && !(step as SelectStep).demoData) {
      return false;
    }

    if (props.demoRid && (step as SelectStep).demoData) {
      return isSlugSame && (props.demoRid === (step as SelectStep).demoData?.rid);
    }

    if (!props.demoRid && (step as SelectStep).demoData) {
      return false;
    }

    return isSlugSame;
  };

  useEffect(() => {
    setStepInfoMap((prev) => {
      const stepInfo = { ...prev };
      return calculateStepInfoMap(stepInfo);
    });
  }, [orderOfSteps]);

  const setSkipInfo = (step: QualificationStep, update: StepInfo): void => {
    setStepInfoMap(prev => {
      const stepInfo = { ...prev, [getStepKey(step)]: update };
      return calculateStepInfoMap(stepInfo);
    });
  };

  const calculateStepInfoMap = (prev: Record<string, StepInfo>): Record<string, StepInfo> => {
    const stepInfo = { ...prev };

    let isDisabled = false;
    for (const step of orderOfSteps) {
      const key = getStepKey(step);
      if (!stepInfo[key]) {
        stepInfo[key] = {
          done: false,
          skipped: false,
          disabled: isDisabled,
        };
      } else {
        stepInfo[key] = {
          ...stepInfo[key],
          disabled: isDisabled,
        };
      }
      if (!isDisabled) {
        isDisabled = step.type === 'leadform-entry' && !stepInfo[key]?.done;
      }
    }
    return stepInfo;
  };

  useEffect(() => {
    getorCreateDemoHubScriptEl(props.config.customScripts);
  }, [props.config.customScripts]);

  useEffect(() => {
    getOrCreateDemoHubStyleEl(props.config.customStyles);
  }, [props.config.customStyles]);

  const getStepReactKey = (step: QualificationStep): string => {
    if (step.type === 'leadform-entry' || step.type === 'text-entry') return step.id;
    if (!step.demoData) return step.id;
    return `${step.id}**${step.demoData.rid}`;
  };

  useEffect(() => {
    if (!rootSheet.current) {
      rootSheet.current = document.createElement('style');
      document.head.appendChild(rootSheet.current);
    }
    rootSheet.current.innerHTML = `
      :root {
        --f-header-border-color: ${ctxValue.config.qualification_page.header.style.bgColor};
        --f-header-font-color: ${ctxValue.config.qualification_page.header.style.fontColor};
        --f-header-bg-color: ${ctxValue.config.qualification_page.header.style.bgColor};
        --f-body-bg-color: ${ctxValue.config.qualification_page.body.style.bgColor};
        --f-body-font-color: ${ctxValue.config.qualification_page.body.style.fontColor};
        
        --f-page-content-gutter: 1.25;
      }

      html, body, div, span, button, p, button, input  {
        font-family: ${ctxValue.config.fontFamily._val ?? 'inherit'} !important;
      }

      button {
        font-weight: bold;
      }

      a.cta {
        font-weight: 600;
      }
  `;
  }, [ctxValue.config]);

  useEffect(() => {
    if (!ctxValue.qualificationConfig) return;
    if (!subSheet.current) {
      subSheet.current = document.createElement('style');
      document.head.appendChild(subSheet.current);
    }
    subSheet.current.innerHTML = `
      :root {
        --f-sidepanel-con-bg-color: ${ctxValue.qualificationConfig.sidePanel.conStyle.bgColor};
        --f-sidepanel-con-font-color: ${ctxValue.qualificationConfig.sidePanel.conStyle.fontColor};
        --f-sidepanel-con-border-color: ${ctxValue.qualificationConfig.sidePanel.conStyle.borderColor};
        --f-sidepanel-card-bg-color: ${ctxValue.qualificationConfig.sidePanel.cardStyle.bgColor};
        --f-sidepanel-card-font-color: ${ctxValue.qualificationConfig.sidePanel.cardStyle.fontColor};
        --f-sidepanel-card-border-color: ${ctxValue.qualificationConfig.sidePanel.cardStyle.borderColor};
        --f-sidepanel-card-border-radius: ${ctxValue.qualificationConfig.sidePanel.cardStyle.borderRadius}px;
      }
  `;
  }, [ctxValue.qualificationConfig]);

  useEffect(() => {
    addFontToHeader(document, props.config.fontFamily._val);
  }, [ctxValue.config.fontFamily._val]);

  const selectedStep = orderOfSteps.filter(isCurrentActiveStep)[0];

  return (
    <DemoHubQlfcnCtx.Provider value={ctxValue}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css" />
      <Tags.RootCon className="dh-page">
        <Header />
        <div className="q-body">
          <Sidepanel sidepanelLinks={sidepanelLinks} />
          <Tags.MainCon
            borderRadius={selectedStep ? `${selectedStep.style.borderRadius}px` : 'unset'}
          >
            {
            orderOfSteps.map((step, idx, arr) => {
              const goToNext = (isSkipped: boolean = false): void => {
                if (idx >= arr.length - 1) return;
                const nextStep = arr[idx + 1];
                const demoData = (nextStep as SelectStep).demoData;
                const demoRid = demoData ? demoData.rid : undefined;
                if (!isSkipped) {
                  setSkipInfo(step, {
                    done: true,
                    skipped: false,
                    disabled: false,
                  });
                }
                props.navigateToStep(nextStep.slug, demoRid);
              };
              const onSkip = (): void => {
                setSkipInfo(step, {
                  done: false,
                  skipped: true,
                  disabled: false,
                });
                goToNext(true);
              };
              const activeStep = isCurrentActiveStep(step);
              return (
                <div key={getStepReactKey(step)}>
                  {step.type === 'text-entry' && <TextEntry
                    entryData={step}
                    isVisible={activeStep}
                    goToNext={() => goToNext()}
                    onSkip={onSkip}
                    isLast={idx === arr.length - 1}
                  />}
                  {step.type === 'leadform-entry' && <LeadFormEntry
                    entryData={step}
                    isVisible={activeStep}
                    goToNext={() => goToNext()}
                    onSkip={onSkip}
                    isLast={idx === arr.length - 1}
                  />}
                  {step.type === 'single-select' && !step.demoData && <SelectEntry
                    isMultiSelect={false}
                    entryData={step}
                    isVisible={activeStep}
                    goToNext={() => goToNext()}
                    onSkip={onSkip}
                    isLast={idx === arr.length - 1}
                  />}
                  {step.type === 'multi-select' && !step.demoData && <SelectEntry
                    isMultiSelect
                    entryData={step}
                    isVisible={activeStep}
                    goToNext={() => goToNext()}
                    onSkip={onSkip}
                    isLast={idx === arr.length - 1}
                  />}
                  {(step as SelectStep).demoData && <DemoEntry
                    entryData={step as SelectStep}
                    isVisible={activeStep}
                    goToNext={() => goToNext()}
                    onSkip={onSkip}
                    isLast={idx === arr.length - 1}
                  />}
                </div>
              );
            })
          }

          </Tags.MainCon>
        </div>
      </Tags.RootCon>
    </DemoHubQlfcnCtx.Provider>
  );
}

export default DemoHubQualification;
