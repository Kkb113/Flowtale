import React, { useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { FrameSettings } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import CaretOutlined from '../icons/caret-outlined';
import { P_RespTour } from '../../entity-processor';
import { FrameSettingsArray } from '../../utils';

interface Props {
  showFrameSettingsDrawer: boolean;
  setShowFrameSettingsDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  updateFrameSetting: (frameSetting : FrameSettings) => void;
  tour: P_RespTour
}

export default function FrameSettingsDrawer(props: Props): JSX.Element {
  const [frameSettings, setFrameSettings] = useState(props.tour.info.frameSettings as FrameSettings);
  return (
    <Tags.StyledDrawer
      title={(<><SettingOutlined /> &nbsp; Miscellaneous</>)}
      open={props.showFrameSettingsDrawer}
      onClose={() => props.setShowFrameSettingsDrawer(false)}
      placement="left"
      width={400}
      className="typ-reg"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div
          className="typ-reg"
          style={{
            marginBottom: '0.25rem'
          }}
        >
          <div>Frame Style</div>
        </div>
        <GTags.FableSelect
          className="typ-ip"
          title="Frame Style"
          value={FrameSettingsArray!.find(f => f.value === frameSettings)}
          size="small"
          bordered={false}
          options={FrameSettingsArray.map((v) => ({
            value: v.value,
            label: v.title
          }))}
          onChange={(value) => {
            props.updateFrameSetting(value as FrameSettings);
            setFrameSettings(value as FrameSettings);
          }}
          suffixIcon={<CaretOutlined dir="down" />}
        />
      </div>
      <div className="typ-sm" style={{ opacity: '0.75' }}>
        <p>
          Configure a browser frame around your embedded demo. If you embed your demo in a landing page, it's highly recommended you add a frame around your demo to make it look like an interactive demo.
        </p>
        <p>
          You can control this behaviour from url as well by adjusting url parameter <code>?fframe=dark</code> or <code>?fframe=light</code> or <code>?fframe=noframe</code>
        </p>
      </div>
    </Tags.StyledDrawer>
  );
}
