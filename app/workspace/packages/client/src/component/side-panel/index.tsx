import {
  ApiOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  HeatMapOutlined,
  MoreOutlined,
  NodeIndexOutlined,
  RiseOutlined,
  SettingOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import { Status } from '@fable/common/dist/api-contract';
import { CmnEvtProp } from '@fable/common/dist/types';
import { Popover, Tooltip } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespSubscription, getNumberOfDaysFromNow } from '../../entity-processor';
import { isActiveBusinessPlan } from '../../utils';
import PlanBadge from './plan-badge';
import * as Tags from './styled';

interface Props {
  selected: 'tours' | 'demo-hub' |'user-management' | 'billing' | 'settings' | 'integrations' | 'leads'
  | 'datasets' | '';
  // eslint-disable-next-line react/no-unused-prop-types
  subs: P_RespSubscription | null;
  compact?: boolean;
}

function sendEvntToAmplitude(tab: 'interactive_demos' | 'user_management' | 'billing' | 'user_guides'
  | 'demo_hub' | 'leads' | 'integrations' | 'datasets' | 'free_demo_consultation' | 'settings'): void {
  import('@fable/common/dist/amplitude').then((amp) => {
    amp.traceEvent(AMPLITUDE_EVENTS.SIDE_PANEL_TAB_CLICKED, { tab }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  }).catch((err) => {
    console.log('error in amplitude event', err);
  });
}

export default function SidePanel(props: Props): JSX.Element {
  if (props.compact) {
    return (
      <Tags.Con>
        <Tags.ConNav>
          <Tooltip placement="right" title="Interactive demos">
            <Tags.ConNavBtn
              className={props.selected === 'tours' ? 'selected' : ''}
              to="/demos?c=1"
              onClick={() => sendEvntToAmplitude('interactive_demos')}
            >
              <NodeIndexOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="User management">
            <Tags.ConNavBtn
              className={props.selected === 'user-management' ? 'selected' : ''}
              to="/users?c=1"
              onClick={() => sendEvntToAmplitude('user_management')}
            >
              <UsergroupAddOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="Billing">
            <Tags.ConNavBtn
              className={props.selected === 'billing' ? 'selected' : ''}
              to="/billing?c=1"
              onClick={() => sendEvntToAmplitude('billing')}
            >
              <CreditCardOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="Free demo consultation">
            <Tags.ConNavBtn
              to="https://www.sharefable.com/get-a-demo?ref=app_dashboard"
              target="_blank"
              onClick={() => sendEvntToAmplitude('free_demo_consultation')}
            >
              <CalendarOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Popover
            content={
              <Tags.ConNav>
                <Tags.ConNavBtn
                  className={props.selected === 'demo-hub' ? 'selected' : ''}
                  to="/demo-hubs?c=1"
                  onClick={() => sendEvntToAmplitude('demo_hub')}
                >
                  <HeatMapOutlined />
                  <p>Demo hub</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn
                  className={props.selected === 'leads' ? 'selected' : ''}
                  to="/leads?c=1"
                  onClick={() => sendEvntToAmplitude('leads')}
                >
                  <RiseOutlined />
                  <p>Leads</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn
                  className={props.selected === 'integrations' ? 'selected' : ''}
                  to="/integrations?c=1"
                  onClick={() => sendEvntToAmplitude('integrations')}
                >
                  <ApiOutlined />
                  <p>Integrations</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn
                  className={props.selected === 'settings' ? 'selected' : ''}
                  to="/settings?c=1"
                  onClick={() => sendEvntToAmplitude('settings')}
                >
                  <SettingOutlined />
                  <p>Settings</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn
                  className={props.selected === 'datasets' ? 'selected' : ''}
                  to="/datasets?c=1"
                  onClick={() => sendEvntToAmplitude('datasets')}
                >
                  <DatabaseOutlined />
                  <p>Datasets</p>
                </Tags.ConNavBtn>
              </Tags.ConNav>
            }
            placement="right"
            trigger="hover"
          >
            { /* eslint-disable-next-line no-script-url */}
            <Tags.ConNavBtn to="javascript:void(0)">
              <MoreOutlined />
            </Tags.ConNavBtn>
          </Popover>
        </Tags.ConNav>
      </Tags.Con>
    );
  }

  return (
    <Tags.Con>
      <Tags.ConNav>
        <Tags.ConNavBtn
          className={props.selected === 'tours' ? 'selected' : ''}
          to="/demos"
          onClick={() => sendEvntToAmplitude('interactive_demos')}
        >
          <NodeIndexOutlined />
          <p>Interactive demos</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'demo-hub' ? 'selected' : ''}
          to="/demo-hubs"
          onClick={() => sendEvntToAmplitude('demo_hub')}
        >
          <HeatMapOutlined />
          <p>Demo hub</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'leads' ? 'selected' : ''}
          to="/leads"
          onClick={() => sendEvntToAmplitude('leads')}
        >
          <RiseOutlined />
          <p>Leads</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'integrations' ? 'selected' : ''}
          to="/integrations"
          onClick={() => sendEvntToAmplitude('integrations')}
        >
          <ApiOutlined />
          <p>Integrations</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'user-management' ? 'selected' : ''}
          to="/users"
          onClick={() => sendEvntToAmplitude('user_management')}
        >
          <UsergroupAddOutlined />
          <p>User management</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'billing' ? 'selected' : ''}
          to="/billing"
          onClick={() => sendEvntToAmplitude('billing')}
        >
          <CreditCardOutlined />
          <p>Billing</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'settings' ? 'selected' : ''}
          to="/settings"
          onClick={() => sendEvntToAmplitude('settings')}
        >
          <SettingOutlined />
          <p>Settings</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'datasets' ? 'selected' : ''}
          to="/datasets"
          onClick={() => sendEvntToAmplitude('datasets')}
        >
          <DatabaseOutlined />
          <p>Datasets</p>
        </Tags.ConNavBtn>
      </Tags.ConNav>
      <div style={{ margin: '0 auto 16px' }}>
        <Tags.ConNavBtn
          to="https://www.sharefable.com/get-a-demo?ref=app_dashboard"
          target="_blank"
          style={{
            outline: '1px solid #16023e'
          }}
          onClick={() => sendEvntToAmplitude('free_demo_consultation')}
        >
          <CalendarOutlined />
          <p>Free demo consultation</p>
        </Tags.ConNavBtn>
      </div>
    </Tags.Con>
  );
}
