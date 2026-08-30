import React, { useEffect, useState } from 'react';
import {
  IAnnotationButton,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  JourneyData
} from '@fable/common/dist/types';
import { createLiteralProperty } from '@fable/common/dist/utils';
import * as Tags from './styled';
import { IAnnotationConfigWithScreen, Timeline } from '../../types';
import { updateButtonProp } from '../annotation/annotation-config-utils';

interface Props {
  btnConf: IAnnotationButton;
  hideConnectionPopover: () => void;
  config: IAnnotationConfig;
  setConfig: React.Dispatch<React.SetStateAction<IAnnotationConfig>>;
  timeline: Timeline;
  journey: JourneyData | null
  opts: ITourDataOpts;
}

interface IProcessedAnnotationConfig extends IAnnotationConfigWithScreen {
  moduleName: string;
  isEntryPoint: boolean;
  isCurrentSelection: boolean;
}

export default function CustomBtnConnectableAnns(props: Props): JSX.Element {
  const [allAnnotations, setAllAnnotations] = useState<IProcessedAnnotationConfig[]>([]);
  const [rankedAnnotations, setRankedAnnotations] = useState<IProcessedAnnotationConfig[]>([]);

  useEffect(() => {
    const allAnns: IProcessedAnnotationConfig[] = [];
    const rankedAnns: IProcessedAnnotationConfig[] = [];

    const isJourneyPresent = Boolean(props.journey?.flows.length);
    const journeyStartPoint = isJourneyPresent ? props.journey?.flows[0].main.split('/')[1] : '';
    const demoMain = props.opts.main.split('/')[1];

    props.timeline.forEach((flow) => {
      flow.forEach((ann, annIdx) => {
        if (ann.refId !== props.config.refId) {
          let isEntryPoint = false;
          let isCurrentSelection = false;
          let moduleName = '';

          if (isJourneyPresent && annIdx === 0) {
            if (ann.refId === journeyStartPoint) isEntryPoint = true;
            if (ann.refId === props.btnConf.hotspot?.actionValue._val.split('/')[1]) isCurrentSelection = true;
            moduleName = props.journey!.flows.find(f => f.main.split('/')[1] === ann.refId)?.header1 || '';
          } else {
            isEntryPoint = demoMain === ann.refId;
            isCurrentSelection = props.btnConf.hotspot?.actionValue._val.split('/')[1] === ann.refId;
          }

          if (moduleName || isEntryPoint) {
            rankedAnns.push({ ...ann, moduleName, isEntryPoint, isCurrentSelection });
          }

          allAnns.push({ ...ann, moduleName, isEntryPoint, isCurrentSelection });
        }
      });
    });

    setAllAnnotations(allAnns);
    setRankedAnnotations(rankedAnns);
  }, [props.timeline, props.opts, props.journey]);

  const handleOnClick = (ann: IAnnotationConfigWithScreen | IProcessedAnnotationConfig): void => {
    const hotspotConfig: ITourEntityHotspot = {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue: createLiteralProperty(`${ann.screen.id}/${ann.refId}`)
    };

    const thisAntn = updateButtonProp(
      props.config,
      props.btnConf.id,
      'hotspot',
      hotspotConfig
    );

    props.setConfig(thisAntn);

    props.hideConnectionPopover();
  };

  return (
    <Tags.ConnectableAnnsCon>
      <h3>Choose annotations that would replay the demo</h3>
      {rankedAnnotations.map(ann => (
        <Tags.ConnectableAnnCon
          key={ann.refId}
          onClick={() => handleOnClick(ann)}
          style={{
            border: ann.isCurrentSelection ? '1px solid gray' : ''
          }}
        >
          <div style={{
            float: 'left',
            width: '140px',
            margin: '0 10px 5px 0',
          }}
          >
            <img
              src={ann.screen.thumbnailUri.href}
              alt={ann.displayText}
              style={{ width: '140px', height: '100px' }}
            />
          </div>
          <Tags.ConnectableAnnText>{ann.displayText}</Tags.ConnectableAnnText>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            {ann.isEntryPoint && (
              <Tags.Pill>
                Replay this demo
              </Tags.Pill>
            )}

            {ann.moduleName && (
              <Tags.Pill>
                Replay module: {ann.moduleName}
              </Tags.Pill>
            )}
          </div>
        </Tags.ConnectableAnnCon>
      ))}

      <h3>Choose from all annotations</h3>
      {allAnnotations.map(ann => (
        <Tags.ConnectableAnnCon
          key={ann.refId}
          onClick={() => handleOnClick(ann)}
          style={{
            border: ann.isCurrentSelection ? '1px solid gray' : ''
          }}
        >
          <div style={{ float: 'left', width: '140px', margin: '0 10px 5px 0' }}>
            <img
              src={ann.screen.thumbnailUri.href}
              alt={ann.displayText}
              style={{ width: '140px', height: '100px' }}
            />
          </div>
          <Tags.ConnectableAnnText>{ann.displayText}</Tags.ConnectableAnnText>
        </Tags.ConnectableAnnCon>
      ))}
    </Tags.ConnectableAnnsCon>
  );
}
