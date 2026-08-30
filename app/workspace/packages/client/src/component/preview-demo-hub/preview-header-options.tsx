import React, { useState } from 'react';
import { Popover, Tooltip } from 'antd';
import ScreenshotMonitorIcon from '../../assets/icons/screenshot-monitor.svg';
import ShareIcon from '../../assets/icons/share.svg';
import PublishButton from '../publish-preview/publish-button';
import { DisplaySize } from '../../utils';
import { amplitudeDemoHubShareModalOpened, amplitudeShareModalOpen } from '../../amplitude';
import * as HTags from '../publish-preview/styled';
import { P_RespDemoHub } from '../../types';

interface Props {
  selectedDisplaySize?: DisplaySize;
  setSelectedDisplaySize: (selectedDisplaySize: DisplaySize) => void;
  demoHub: P_RespDemoHub | null;
  publishDemoHub: (demo: P_RespDemoHub) => Promise<boolean>;
  showShareModal: boolean;
  setShowShareModal: (showShareModal: boolean) => void;
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean) => void;
  renderedIn: 'preview' | 'editor';
}

export default function PreviewHeaderOptions(props: Props): JSX.Element {
  const [openPopover, setOpenPopover] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);

  return (
    <>
      <HTags.Header>
        <div className="right-section">
          {props.selectedDisplaySize && (
          <Popover
            content={<DisplaySizeMenu
              selectedDisplaySize={props.selectedDisplaySize}
              setSelectedDisplaySize={props.setSelectedDisplaySize}
              setOpenPopover={setOpenPopover}
            />}
            arrow={false}
            placement="bottom"
            open={openPopover}
            onOpenChange={(visible) => setOpenPopover(visible)}
          >
            <img className="action-icon" src={ScreenshotMonitorIcon} alt="" />
          </Popover>
          )}
          <Tooltip title="Embed" overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
            <div onClick={() => {
              amplitudeDemoHubShareModalOpened({ clicked_from: props.renderedIn, demo_hub_rid: props.demoHub!.rid });
              props.setShowShareModal(true);
            }}
            >
              <img className="action-icon" src={ShareIcon} alt="" />
            </div>
          </Tooltip>
          {/* TODO: uncomment after setup analytics */}
          {/* <Tooltip title="Insights" overlayStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
                <Link to={props.demo ? `/analytics/demo/${props.demo.rid}` : ''}>
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<BarChartOutlined
                      style={{ color: 'white' }}
                    />}
                  />
                </Link>
              </Tooltip> */}
          <div className="publish-btn">
            <PublishButton
              setIsPublishFailed={setIsPublishFailed}
              setIsPublishing={props.setIsPublishing}
              publishDemoHub={props.publishDemoHub}
              tour={null}
              demoHub={props.demoHub}
              size="medium"
              openShareModal={() => {
                props.setShowShareModal(true);
                amplitudeShareModalOpen('preview');
              }}
              isPublishing={props.isPublishing}
              clickedFrom="preview"
            />
          </div>
        </div>
        {/* TODO: add Share modal */}
        {props.showShareModal}
      </HTags.Header>
    </>
  );
}

interface DisplaySizeMenuProps {
  selectedDisplaySize: DisplaySize;
  setSelectedDisplaySize: (selectedDisplaySize: DisplaySize) => void;
  setOpenPopover: React.Dispatch<React.SetStateAction<boolean>>;
}

function DisplaySizeMenu(props: DisplaySizeMenuProps): JSX.Element {
  const handleMenuItemClick = (displaySize: DisplaySize): void => {
    props.setSelectedDisplaySize(displaySize);
    props.setOpenPopover(false);
  };

  return (
    <HTags.PopoverCon>
      <div className="title">
        Select screen size
      </div>
      <HTags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MEDIUM)}
        selected={props.selectedDisplaySize === DisplaySize.MEDIUM}
      >
        Desktop
      </HTags.PopoverMenuItem>
      <HTags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MOBILE_PORTRAIT)}
        selected={props.selectedDisplaySize === DisplaySize.MOBILE_PORTRAIT}
      >
        Mobile
      </HTags.PopoverMenuItem>
    </HTags.PopoverCon>
  );
}
