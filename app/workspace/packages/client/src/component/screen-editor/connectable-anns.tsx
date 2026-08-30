import React from 'react';
import { IAnnotationButton, IAnnotationConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import { IAnnotationConfigWithScreen, Timeline } from '../../types';

interface Props {
  connectableAnns: IAnnotationConfigWithScreen[];
  currScreenId: number;
  config: IAnnotationConfig;
  btnConf: IAnnotationButton;
  updateConnection: (fromMain: string, toMain: string) => void;
  hideConnectionPopover: () => void;
}

export default function ConnectableAnns(props: Props): JSX.Element {
  return (
    <Tags.ConnectableAnnsCon>
      {props.connectableAnns.map(ann => (
        <Tags.ConnectableAnnCon
          key={ann.refId}
          onClick={() => {
            const fromMain = `${props.currScreenId}/${props.config.refId}`;
            const toMain = `${ann.screen.id}/${ann.refId}`;
            if (props.btnConf.type === 'next') {
              props.updateConnection(fromMain, toMain);
            } else {
              props.updateConnection(toMain, fromMain);
            }
            props.hideConnectionPopover();
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
