import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as GTags from '../../common-styled';
import Button from '../button';
import { P_RespSubscription } from '../../entity-processor';
import { amplitudeUpgradeModalCTAClicked } from '../../amplitude';

interface Props {
    showUpgradePlanModal: boolean;
    setShowUpgradePlanModal: (upgrade: boolean)=>void;
    subs: P_RespSubscription | null;
    isInBeta?: boolean;
}

function UpgradeModal(props: Props) : JSX.Element {
  const navigate = useNavigate();

  const closeModal = () : void => {
    props.setShowUpgradePlanModal(false);
  };

  return (
    <div>
      <GTags.BorderedModal
        style={{ height: '10px' }}
        donotShowHeaderStip
        containerBg="#f5f5f5"
        open={props.showUpgradePlanModal}
        onOk={closeModal}
        onCancel={closeModal}
        footer={(
          <div className="button-two-col-cont">
            {props.isInBeta
              ? (
                <Button
                  type="submit"
                  style={{ flex: 1 }}
                  className="support-bot-open"
                  onClick={() => amplitudeUpgradeModalCTAClicked('talk_to_us')}
                >
                  Talk to us
                </Button>
              )
              : (
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                  <Button
                    intent="secondary"
                    type="submit"
                    className="support-bot-open"
                    style={{
                      flex: '1 0 auto'
                    }}
                    onClick={() => amplitudeUpgradeModalCTAClicked('talk_to_us')}
                  >
                    Talk to us
                  </Button>
                  <Button
                    type="submit"
                    style={{
                      width: '100%',
                      background: 'rgb(254, 223, 100)',
                      color: 'black',
                      outline: 'rgb(22, 2, 69) solid 1px'
                    }}
                    onClick={() => {
                      amplitudeUpgradeModalCTAClicked('upgrade');
                      navigate('/billing');
                    }}
                  >
                    Upgrade
                  </Button>
                </div>
              )}
          </div>
      )}
      >
        <div className="typ-h1">{props.isInBeta ? 'This feature is in beta.' : 'Upgrade to use this feature'}</div>
        {props.isInBeta
          ? (
            <>
              <p
                className="typ-reg"
                style={{
                  marginBlockStart: '1rem',
                  marginBlockEnd: '0.5rem'
                }}
              >
                If you want access this feature contact support.
              </p>
            </>
          )
          : (
            <>
              {props.subs && (
              <>
                <p
                  className="typ-reg"
                  style={{
                    marginBlockStart: '1rem',
                    marginBlockEnd: '0.5rem'
                  }}
                >
                  You are currently on <em>{props.subs.paymentPlan}-{props.subs.paymentInterval}</em> plan. This feature is not available in this plan.
                </p>
                <p
                  className="typ-reg"
                  style={{
                    marginBlockStart: '1rem',
                    marginBlockEnd: '0.5rem'
                  }}
                >
                  Please Upgrade your account by choosing our paid plans.
                </p>
              </>
              )}
            </>
          )}
      </GTags.BorderedModal>
    </div>
  );
}

export default UpgradeModal;
