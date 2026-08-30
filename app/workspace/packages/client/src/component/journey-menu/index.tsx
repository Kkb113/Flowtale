import { BarsOutlined, CaretRightFilled, CloseOutlined, ContainerOutlined, LockFilled, RightCircleFilled } from '@ant-design/icons';
import { Dropdown, Tooltip } from 'antd';
import React, { ReactElement, useEffect, useState } from 'react';
import { JourneyData, ITourDataOpts, JourneyFlow, CreateJourneyPositioning } from '@fable/common/dist/types';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import { getColorContrast, getProcessedJourney, isBlankString } from '../../utils';
import { FlowProgress, ScreenSizeData } from '../../types';
import { ProgressCircle } from '../progress-circle';

interface Props {
  journey: JourneyData;
  isJourneyMenuOpen: boolean;
  navigateToJourney: (main: string)=> void;
  updateJourneyMenu: (isMenuOpen: boolean)=> void;
  navigateToCta: ()=> void;
  tourOpts: ITourDataOpts;
  currentFlowMain: string;
  journeyProgress: FlowProgress[];
  currScreenId: number;
  screenSizeData: Record<string, ScreenSizeData>;
  theme?: 'light' | 'dark';
}

interface FlowWithLastMandatory extends JourneyFlow{
  lastMandatory: number
}

interface JourneyWithLastMandatory extends JourneyData {
  flows: FlowWithLastMandatory[]
}

export const getMenu = (
  journey: JourneyWithLastMandatory,
  navigateToJourney: (main: string)=> void,
  navigateToCta: ()=> void,
  tourOpts: ITourDataOpts,
  currentFlowMain: string,
  journeyProgress: FlowProgress[],
  updateJourneyMenu: (isMenuOpen: boolean)=> void,
  maxWidth: number,
  theme?: 'light' | 'dark'
) : ReactElement => {
  const getFlowProgress = (main: string) : FlowProgress => {
    const currenFlowProgress = journeyProgress.find(
      (flow) => flow.main === main
    ) || { completedSteps: 0, totalSteps: 10, main };
    return currenFlowProgress;
  };

  const getIsCurrentFlowDisabled = (navToIndex: number): boolean => {
    const lastMandatoryFlowIdx = journey.flows[navToIndex].lastMandatory;

    if (lastMandatoryFlowIdx === -1) {
      return false;
    }

    const currentProgress = journeyProgress[lastMandatoryFlowIdx];
    const isMandatoryModuleCompleted = currentProgress.completedSteps === currentProgress.totalSteps;
    if (isMandatoryModuleCompleted) {
      return false;
    }

    return true;
  };

  return (
    <Tags.JourneyCon
      className="module-root-con"
      maxW={maxWidth === 0 ? '100vw' : `${maxWidth}px`}
      moduleTheme={theme || 'light'}
    >
      <Tags.FLowTitle>
        {journey.title}
      </Tags.FLowTitle>
      <div style={{ maxHeight: '45vh', overflow: 'auto' }}>
        {journey.flows.map((flow, idx) => {
          const isMenuDisabled = getIsCurrentFlowDisabled(idx);
          const flowProgress = getFlowProgress(flow.main);
          const lastMandatoryFlowIdx = journey.flows[idx].lastMandatory;
          const lastMandatoryModule = (lastMandatoryFlowIdx > -1) ? journey.flows[lastMandatoryFlowIdx].header1 : '';
          return (!isBlankString(flow.main)
            ? (
              <Tooltip
                key={flow.header1}
                title={isMenuDisabled ? (
                  <>
                    Please complete the <em>{lastMandatoryModule}</em> module before proceeding.
                  </>
                ) : null}
                destroyTooltipOnHide
                placement={journey.positioning === CreateJourneyPositioning.Left_Bottom ? 'right' : 'left'}
                overlayStyle={{
                  lineHeight: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  borderRadius: '8px'
                }}
              >
                <Tags.FLowItemCon
                  key={flow.header1}
                  onClick={() => {
                    if (!isMenuDisabled) {
                      navigateToJourney(flow.main);
                      updateJourneyMenu(false);
                    }
                  }}
                  className={`flow-item ${flow.main === currentFlowMain ? 'sel' : ''}`}
                  disabled={isMenuDisabled}
                >
                  <div style={{ width: '16px', height: '16px', position: 'absolute', top: '16px' }}>
                    <ProgressCircle
                      totalmodules={flowProgress.totalSteps}
                      completedModules={flowProgress.completedSteps}
                      progressCircleSize={16}
                    />
                  </div>
                  <div style={{ marginLeft: '32px', flexGrow: 1 }}>
                    <Tags.FlowHeader1>
                      <div>
                        {flow.header1}&nbsp;
                        {journey.flows[idx].mandatory && (
                          <span className="superscript">
                            *
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#747474' }}>
                        {isMenuDisabled ? (
                          <LockFilled />
                        ) : (
                          <CaretRightFilled />
                        )}
                      </div>
                    </Tags.FlowHeader1>
                    <Tags.FlowHeader2>{flow.header2}</Tags.FlowHeader2>
                  </div>
                </Tags.FLowItemCon>
              </Tooltip>
            )
            : null);
        })}
      </div>
      {journey.cta && journey.cta.navigateTo && (
      <div style={{ margin: '8px 16px 0 16px' }}>
        <GTags.CTABtn
          size={journey.cta.size._val}
          onClick={navigateToCta}
          style={{ width: '100%' }}
          color={journey.primaryColor._val}
          borderRadius={tourOpts.borderRadius._val}
        >
          {journey.cta.text._val}
        </GTags.CTABtn>
      </div>
      )}
    </Tags.JourneyCon>
  );
};

function getCurretFlowTitle(flows: JourneyFlow[], currentFlowMain: string): string {
  const currentFlow = flows.find((flow) => flow.main === currentFlowMain);
  return currentFlow ? currentFlow.header1 : '';
}

function JourneyMenu(props: Props): JSX.Element {
  const primaryColor = props.journey.primaryColor;
  const [dropdownPos, setDropdownPos] = useState<{top: number, left: number, transformTranslateX: number, maxWidth: number} | null>(null);
  const [processedJourney, setProcessedJourney] = useState<null | JourneyWithLastMandatory>(null);
  const paddingFactor = 10;
  const [scaleFactor, setScaleFactor] = useState<number | null>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  useEffect(() => {
    if (scaleFactor) {
      if (props.isJourneyMenuOpen) {
        setTimeout(() => {
          setShowDropdown(true);
        }, 500);
      } else {
        setShowDropdown(false);
      }
    }
  }, [props.isJourneyMenuOpen, scaleFactor]);

  useEffect(() => {
    setProcessedJourney(getProcessedJourney(props.journey));
  }, [props.journey]);

  useEffect(() => {
    if (props.currScreenId === -1 || !props.screenSizeData[props.currScreenId]) {
      setScaleFactor(1);
      return;
    }
    const iframeRect = props.screenSizeData[props.currScreenId].iframePos;
    const sftr = Math.min(props.screenSizeData[props.currScreenId].scaleFactor * 1.25, 1);

    if (iframeRect) {
      const menuButtonHeight = 40;
      const journeyTop = iframeRect.top + iframeRect.height - paddingFactor - menuButtonHeight;
      const journeyLeft = props.journey.positioning === CreateJourneyPositioning.Left_Bottom
        ? iframeRect.left + paddingFactor
        : iframeRect.left + iframeRect.width - paddingFactor;
      const journeyTransformTranslateX = props.journey.positioning === CreateJourneyPositioning.Left_Bottom ? 0 : -100;

      setDropdownPos({
        top: journeyTop,
        left: journeyLeft,
        transformTranslateX: journeyTransformTranslateX,
        maxWidth: iframeRect.width - paddingFactor - iframeRect.left - 10
      });
    }
    setScaleFactor(sftr || 1);
  }, [props.currScreenId, props.screenSizeData]);

  return (
    <Tags.DropdownCon
      transformTranslateX={dropdownPos?.transformTranslateX}
      left={dropdownPos?.left}
      top={dropdownPos?.top}
      positioning={props.journey.positioning}
    >
      { processedJourney && (
        <Dropdown
          open={props.isJourneyMenuOpen}
          dropdownRender={() => getMenu(
            processedJourney,
            props.navigateToJourney,
            props.navigateToCta,
            props.tourOpts,
            props.currentFlowMain,
            props.journeyProgress,
            props.updateJourneyMenu,
            dropdownPos?.maxWidth || 0,
            props.theme
          )}
          overlayStyle={showDropdown ? {
            transform: `scale(${scaleFactor})`,
            transformOrigin: props.journey.positioning === CreateJourneyPositioning.Left_Bottom
              ? 'bottom left' : 'bottom right'
          }
            : { visibility: 'hidden' }}
          trigger={['click']}
          onOpenChange={(e) => { props.updateJourneyMenu(e); }}
          placement={props.journey.positioning === CreateJourneyPositioning.Left_Bottom ? 'topLeft' : 'topRight'}
        >
          {props.isJourneyMenuOpen ? (
            <Tags.IndexButton
              type="primary"
              shape="circle"
              color={primaryColor._val}
              applywidth="true"
              icon={<CloseOutlined />}
              scalefactor={scaleFactor || 1}
              positioning={props.journey.positioning}
            />
          ) : (
            <Tags.IndexButton
              color={primaryColor._val}
              type="primary"
              applywidth="false"
              scalefactor={scaleFactor || 1}
              positioning={props.journey.positioning}
            >
              <ContainerOutlined style={{
                color: getColorContrast(primaryColor._val) === 'dark' ? 'fff' : '000', fontSize: '20px' }}
              />
              <Tags.IndexButtonContent>
                <span style={{ fontWeight: '500', fontSize: '14px', lineHeight: '1.2' }}>
                  {getCurretFlowTitle(props.journey.flows, props.currentFlowMain)}
                </span>
                <span style={{ lineHeight: '1.2', fontSize: '12px' }}>
                  {props.journey.title}
                </span>
              </Tags.IndexButtonContent>
            </Tags.IndexButton>
          )}
        </Dropdown>
      )}
    </Tags.DropdownCon>
  );
}

export default JourneyMenu;
