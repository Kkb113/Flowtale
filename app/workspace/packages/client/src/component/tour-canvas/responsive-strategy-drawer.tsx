import React from 'react';
import { MobileOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
import { ReqTourPropUpdate, Responsiveness } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import { P_RespTour } from '../../entity-processor';
import { isTourResponsive } from '../../utils';
import FableButton from '../button';
import { OurLink, OurRadio } from '../../common-styled';
import { amplitudeResponsivenessChange, amplitudeResponsivenessSelectRadio } from '../../amplitude';

interface Props {
  showMobileResponsivenessDrawer: boolean;
  setShowMobileResponsivenessDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  selectedResponsivenessStrategy: Responsiveness;
  setSelectedResponsivenessStrategy: React.Dispatch<React.SetStateAction<Responsiveness>>;
  tour: P_RespTour;
  updateResponsiveness: (responsiveness: Responsiveness) => void;
}

export default function ResponsiveStrategyDrawer(props: Props): JSX.Element {
  return (
    <Tags.StyledDrawer
      title={(<><MobileOutlined /> &nbsp; Mobile Responsiveness</>)}
      open={props.showMobileResponsivenessDrawer}
      onClose={() => props.setShowMobileResponsivenessDrawer(false)}
      placement="left"
      width={600}
      className="typ-reg"
    >
      <Radio.Group
        value={props.selectedResponsivenessStrategy}
        onChange={e => {
          amplitudeResponsivenessSelectRadio(e.target.value);
          if (
            e.target.value === Responsiveness.NoResponsive
          && props.tour.responsive2 !== Responsiveness.NoResponsive
          ) {
            props.updateResponsiveness(Responsiveness.NoResponsive);
            amplitudeResponsivenessChange(Responsiveness.NoResponsive, 'canvas-menu-item-drawer');
          }
          props.setSelectedResponsivenessStrategy(e.target.value);
        }}
      >
        <OurRadio value={Responsiveness.Responsive}>
          <p className="typ-h2">My application is mobile responsive</p>
          <p style={{ fontSize: '0.75rem' }}>
            Choose this option if your application adapts to different screen sizes (desktop & mobile).
            Do note that responsiveness is based on the application development by your team.
            <br />
          </p>

          {props.selectedResponsivenessStrategy === Responsiveness.Responsive && (
          <>
            <p className="typ-reg">
              If your application is mobile responsive, please click the button below.
              Fable will manage your demo on mobile gracefully.
            </p>
            <FableButton
              onClick={() => {
                props.updateResponsiveness(Responsiveness.Responsive);
                amplitudeResponsivenessChange(Responsiveness.Responsive, 'canvas-menu-item-drawer');
              }}
              disabled={isTourResponsive(props.tour)}
            >
              {isTourResponsive(props.tour)
                ? 'Your app is made responsive'
                : 'Make this demo mobile responsive'}

            </FableButton>

            {isTourResponsive(props.tour) && (
            <>
              <p className="typ-reg">
                Note: All your screens are now made responsive. If needed, you can check each screen now and
                see if the guides are displayed properly in mobile.
                If they are not (this might happen in case your application
                adapts to different layouts for different devices),
                you can readjust the guide for different devices.
              </p>

              <OurLink
                href={`/preview/demo/${props.tour.rid}?s=3`}
                target="_blank"
                rel="noreferrer"
                className="highlighted-link"
              >
                Checkout how this demo would look on Mobile devices
              </OurLink>
            </>
            )}
          </>
          )}

        </OurRadio>

        <OurRadio value={Responsiveness.NoResponsive}>
          <p className="typ-h2">My application is not mobile responsive</p>
          {props.selectedResponsivenessStrategy === Responsiveness.NoResponsive && (
          <>
            <p className="typ-reg">
              If your application is not mobile responsive, Fable tries to provide a
              standard experience when your demo is viewed on mobile.
            </p>

            <p className="typ-reg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MobileOutlined style={{ fontSize: '1.5rem' }} /> In portrait mode
            </p>

            <div style={{ marginLeft: '1.75rem', }}>
              <p className="typ-reg">
                In this mode, we show the following warning: You can rotate your screen for a better experience.
                Alternatively, you can view this demo on a desktop.
              </p>
              <OurLink
                style={{
                  marginTop: '0.5rem',
                  display: 'block'
                }}
                href={`/preview/demo/${props.tour.rid}?s=3`}
                target="_blank"
                rel="noreferrer"
              >
                Checkout how this demo would look on Portrait mode
              </OurLink>
            </div>

            <p className="typ-reg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: 0 }}>
              <MobileOutlined rotate={270} style={{ fontSize: '1.5rem' }} />
              In landscape mode
            </p>

            <div
              style={{
                marginLeft: '1.75rem',
                marginTop: '1rem',
              }}
            >
              <p className="typ-reg">
                In this mode, we show a scaled version of the demo.
              </p>
              <OurLink
                href={`/preview/demo/${props.tour.rid}?s=4`}
                target="_blank"
                rel="noreferrer"
              >
                Checkout how this demo would look on Landscape mode
              </OurLink>
            </div>
          </>
          )}
        </OurRadio>
      </Radio.Group>
    </Tags.StyledDrawer>
  );
}
