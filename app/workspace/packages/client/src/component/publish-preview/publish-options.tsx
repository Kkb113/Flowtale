import React, { useState } from 'react';
import { Popover, Tooltip, Button as AntButton } from 'antd';
import { BarChartOutlined, MoreOutlined, UndoOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { IAnnotationConfig, CmnEvtProp } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import * as Tags from './styled';
import ScreenshotMonitorIcon from '../../assets/icons/screenshot-monitor.svg';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import { DisplaySize } from '../../utils';
import RecreateUsingAI from './recreate-option';
import * as GTags from '../../common-styled';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  selectedDisplaySize: DisplaySize;
  setSelectedDisplaySize: (selectedDisplaySize: DisplaySize) => void;
  tour: P_RespTour | null;
  handleReplayClick: () => void;
  minimalHeader: boolean;
  recreateUsingAI: (updateLoading:(step: string)=>void)=>void;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  subs: P_RespSubscription | null;
}

export default function PublishOptions(props: Props): JSX.Element {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <>
      <Tags.Header>
        <div className="right-section">
          <Tooltip title="Replay" overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
            <div onClick={props.handleReplayClick}>
              <UndoOutlined className="action-icon" />
            </div>
          </Tooltip>
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
          {!props.minimalHeader && (
            <>
              <Tooltip title="Insights" overlayStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
                <Link to={props.tour ? `/analytics/demo/${props.tour.rid}` : ''}>
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<BarChartOutlined
                      style={{ color: 'white' }}
                    />}
                    onClick={() => {
                      traceEvent(
                        AMPLITUDE_EVENTS.VIEW_DEMO_ANALYTICS,
                        { analytics_clicked_from: 'preview_header',
                        },
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    }}
                  />
                </Link>
              </Tooltip>
              <GTags.StyledPopover
                trigger="click"
                content={
                  <GTags.PopoverOption>
                    <RecreateUsingAI
                      recreateUsingAI={props.recreateUsingAI}
                      annotationsForScreens={props.annotationsForScreens}
                      subs={props.subs}
                    />
                  </GTags.PopoverOption>
                  }
              >
                <div
                  style={{
                    color: 'white',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                  }}
                  id="step-3"
                >
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<MoreOutlined
                      style={{ color: 'white' }}
                    />}
                  />
                </div>
              </GTags.StyledPopover>
            </>
          )}
        </div>
      </Tags.Header>
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
    <Tags.PopoverCon>
      <div className="title">
        Select screen size
      </div>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.FIT_TO_SCREEN)}
        selected={props.selectedDisplaySize === DisplaySize.FIT_TO_SCREEN}
      >
        Fit to screen
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MEDIUM)}
        selected={props.selectedDisplaySize === DisplaySize.MEDIUM}
      >
        Medium
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.SMALL)}
        selected={props.selectedDisplaySize === DisplaySize.SMALL}
      >
        Small
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MOBILE_PORTRAIT)}
        selected={props.selectedDisplaySize === DisplaySize.MOBILE_PORTRAIT}
      >
        Mobile (Portrait)
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MOBILE_LANDSCAPE)}
        selected={props.selectedDisplaySize === DisplaySize.MOBILE_LANDSCAPE}
      >
        Mobile (Landscape)
      </Tags.PopoverMenuItem>
    </Tags.PopoverCon>
  );
}
