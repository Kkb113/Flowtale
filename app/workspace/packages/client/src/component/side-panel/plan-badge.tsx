import React from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Interval, Plan, Status } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import { P_RespSubscription } from '../../entity-processor';

interface Props {
  onClick: ()=> void;
  subs: P_RespSubscription;
}

interface badgeText {
  title: string,
  subTitle: string,
  type: 'warn' | 'normal',
  hide: boolean;
}

const getPlanBadgeText = (subs: P_RespSubscription) : badgeText => {
  const badgeText: badgeText = {
    title: '',
    subTitle: '',
    type: 'warn',
    hide: false
  };

  if (subs.paymentInterval === Interval.LIFETIME) {
    const tier = +(subs.paymentPlan.at(-1) || '1');
    return {
      title: `License Tier ${tier}`,
      subTitle: tier < 3 ? 'Upgrade license' : '',
      type: tier < 3 ? 'warn' : 'normal',
      hide: false
    };
  }

  if (subs.paymentPlan === Plan.SOLO) {
    badgeText.title = 'Upgrade now';
    return badgeText;
  }

  if (subs.status === Status.ACTIVE) {
    if (subs.paymentPlan === Plan.STARTUP) {
      badgeText.title = 'Upgrade now';
      badgeText.subTitle = 'On Startup Plan';
    } else if (subs.paymentPlan === Plan.BUSINESS) {
      badgeText.hide = true;
    }
    return badgeText;
  }

  if (subs.status === Status.IN_TRIAL) {
    badgeText.title = 'On Trial';
    badgeText.subTitle = subs.displayableTrialEndsOn as string;
    return badgeText;
  }

  badgeText.title = 'Expired';
  badgeText.subTitle = 'Renew your subscription by clicking here';

  return badgeText;
};

export default function PlanBadge(props: Props): JSX.Element {
  const badgeText: badgeText = getPlanBadgeText(props.subs);

  return (
    <Tags.PlanBadgeCon
      onClick={props.onClick}
      style={{
        visibility: badgeText.hide ? 'hidden' : 'visible',
        background: badgeText.type === 'warn' ? '#ff7450' : 'inherit',
        color: badgeText.type === 'warn' ? 'white' : 'inherit'
      }}
    >
      <ThunderboltOutlined style={{ fontSize: 20 }} />
      <div style={{ width: '75%' }}>
        <div style={{ fontWeight: '500' }}>
          {badgeText.title}
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          {badgeText.subTitle}
        </div>
      </div>
    </Tags.PlanBadgeCon>
  );
}
