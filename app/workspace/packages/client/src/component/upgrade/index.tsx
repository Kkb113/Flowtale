import { StarFilled } from '@ant-design/icons';
import React, { useState } from 'react';
import { P_RespSubscription } from '../../entity-processor';
import Button from '../button';
import UpgradeModal from './upgrade-modal';
import { amplitudeUpgradeModalOpen, UpgradeModalClickedFrom } from '../../amplitude';

interface Props {
  scaleDown?: boolean;
  subs: P_RespSubscription | null;
  isInBeta?: boolean;
  hideIcon?: boolean;
  inline?: boolean;
  clickedFrom: UpgradeModalClickedFrom;
}

function Upgrade({ inline, scaleDown, subs, isInBeta, hideIcon, clickedFrom }: Props): JSX.Element {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);
  return (
    <>
      <div
        className="upgrade-con"
        style={{
          transform: !inline ? (scaleDown ? 'scale(0.9) translate(-50%, -50%)' : '') : 'none',
          left: !inline ? (scaleDown ? '30%' : '49%') : 'auto',
          top: !inline ? 'inherit' : 'auto',
          position: !inline ? 'inherit' : 'unset'
        }}
      >
        <Button
          size="small"
          style={{
            background: '#fedf64',
            color: 'black',
            outline: '1px solid #160245'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowUpgradePlanModal(true);
            amplitudeUpgradeModalOpen(clickedFrom);
          }}
          iconPlacement="left"
          icon={!hideIcon && <StarFilled style={{
            color: '#7567ff'
          }}
          />}
        >{isInBeta ? 'In Beta' : 'Upgrade'}
        </Button>
      </div>
      <UpgradeModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
        subs={subs}
        isInBeta={isInBeta}
      />
    </>
  );
}
export default Upgrade;
