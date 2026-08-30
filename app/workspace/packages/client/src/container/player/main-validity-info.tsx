import React from 'react';
import { TourMainValidity } from '../../types';
import InfoCon from '../../component/info-con';

interface Props {
  tourMainValidity: TourMainValidity;
  tourRid: string;
}

function MainValidityInfo(props: Props): JSX.Element {
  return (
    <InfoCon
      heading="Entry point is not valid for this demo"
      body={
        <>
          {props.tourMainValidity === TourMainValidity.Main_Not_Set && (
            <p>
              Entry point is the annotation where the demo starts. You can set
              an annotation as an entry point by:
            </p>
          )}
          {props.tourMainValidity === TourMainValidity.Main_Not_Present && (
            <p>
              Entry point of the demo is not valid. You can reset an annotation as an
              entry point by:
            </p>
          )}
          {(props.tourMainValidity === TourMainValidity.Main_Not_Present
            || props.tourMainValidity === TourMainValidity.Main_Not_Set) && (
            <ol>
              <li>Clicking on the annotation</li>
              <li>
                Expanding <em>Advanced</em> section
              </li>
              <li>
                <em>Checking </em> Entry Point
              </li>
            </ol>
          )}
          {props.tourMainValidity
            === TourMainValidity.Journey_Main_Not_Present && (
            <>
              <p>
                Entry point set for one of the modules isn't valid. Please
                reselect the module's entry by:
              </p>
              <ol>
                <li>Clicking on the Edit Module icon.</li>
                <li>Reselecting the annotation for the modules.</li>
              </ol>
            </>
          )}
        </>
      }
      btns={[
        {
          type: 'primary',
          linkTo: `/demo/${props.tourRid}`,
          text: 'Go to canvas',
        },
      ]}
    />
  );
}

export default MainValidityInfo;
