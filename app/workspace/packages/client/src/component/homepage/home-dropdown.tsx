import React, { useState } from 'react';
import { BulbOutlined, CaretRightOutlined, ChromeOutlined, RiseOutlined } from '@ant-design/icons';
import ActionPanel from '../screen-editor/action-panel';
import Button from '../button';
import UserGuideDetails from '../side-panel/user-guide-details';
import * as Tags from './dropdown-styled';
import { BorderedModal, OurCollapse } from '../../common-styled';
import UseCases from './use-case/use-cases';
import { DEMO_TIPS } from '../../utils';
import UserGuideProgress from '../side-panel/user-guide-progess';

interface Props {
  atLeastOneDemoCreated: boolean;
  firstTourId ?: string;
  useCases ?: string[];
  isExtInstalled: boolean
}

function HomeDropDown(props: Props) : JSX.Element {
  let displayDemoTips = DEMO_TIPS;

  if (props.useCases !== undefined) {
    displayDemoTips = displayDemoTips.sort((a, b) => {
      const aHasUsecase = a.type.some(type => props.useCases!.includes(type));
      const bHasUsecase = b.type.some(type => props.useCases!.includes(type));

      if (aHasUsecase && !bHasUsecase) return -1;
      if (bHasUsecase && !aHasUsecase) return 1;
      return 0;
    });
  }
  return (
    <Tags.HomeDropdown>
      <OurCollapse
        expandIconPosition="start"
          // eslint-disable-next-line react/no-unstable-nested-components
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        size="small"
        bordered={false}
        style={{
          borderRadius: '4px',
          marginTop: '10px'
        }}
        items={[{
          key: '2',
          label: (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            >
              <div className="typ-h3 collapse-header">User guides</div>
              <UserGuideProgress
                selected
                onClick={() => {}}
              />
            </div>
          ),
          children: (
            <UserGuideDetails
              close={() => {}}
              show
              tourAvailable={props.atLeastOneDemoCreated}
              firstTourRid={props.firstTourId || ''}
              inDropdown
            />
          )
        }, {
          key: '3',
          label: <div className="typ-h3 collapse-header">See what you can do with Fable</div>,
          children: <UseCases singleRow />
        }, {
          key: '4',
          label: <div className="typ-h3 collapse-header">Demo tips</div>,
          children: (
            <div className="demo-tips-con">
              {
                  displayDemoTips.map(demoTip => (
                    <div key={demoTip.tip} className={`demo-tip ${demoTip.type[0]} typ-reg`}>
                      <span className="icon"><BulbOutlined /></span> <span>{demoTip.tip}</span>
                    </div>
                  ))
                }
            </div>
          )
        }]}
      />
      {
          !props.isExtInstalled && (
          <Button
            style={{ padding: '1rem 1.5rem', margin: '1rem auto' }}
            onClick={() => {
              window.open(
                'https://chrome.google.com/webstore/detail/fable/ekmabenadlgfkjplmpldkjkhiikobaoc',
                '_blank'
              );
            }}
            icon={<ChromeOutlined />}
            iconPlacement="left"
            size="large"
          >
            Install Chrome Extension
          </Button>
          )
        }
    </Tags.HomeDropdown>
  );
}

export default HomeDropDown;
