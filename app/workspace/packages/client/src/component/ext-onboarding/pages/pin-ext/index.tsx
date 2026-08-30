import React from 'react-dom';
import { useEffect } from 'react';
import { Link, useNavigation } from 'react-router-dom';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import * as CTags from '../../styled';
import LoveEyesEmoji from '../../../../assets/onboarding/love-eyes.png';
import CurvedArrow from '../../../../assets/onboarding/curved-arrow.svg';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/pin-ext-browser.png';
import TopLoader from '../../../loader/top-loader';
import { TOP_LOADER_DURATION } from '../../../../constants';

interface Props {
  title: string,
}

export default function PinExt(props: Props): JSX.Element {
  const { state: loadingState } = useNavigation();

  useEffect(() => {
    document.title = props.title;
  }, []);

  return (
    <>
      {loadingState === 'loading' && <TopLoader duration={TOP_LOADER_DURATION} showLogo={false} />}
      <CTags.ContentWrapper>
        <CTags.MotionDivWrapper
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CTags.FlexColContainer>
            <img
              src={LoveEyesEmoji}
              alt=""
              width={48}
              style={{
                display: 'block'
              }}
            />
            <CTags.Header
              style={{ position: 'relative' }}
            >
              <CTags.SpanBlock>Extension Installed!</CTags.SpanBlock>Pin it for easy access

              <img
                src={CurvedArrow}
                alt=""
                style={{
                  position: 'absolute',
                  bottom: '-70%',
                  right: '-30%',
                  width: '187px'
                }}
              />

            </CTags.Header>
            <CTags.Subtitle>
              Pinning your Fable extension will keep it handy when you want to create your interactive demos.😄
            </CTags.Subtitle>
          </CTags.FlexColContainer>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Button icon={<img src={ArrowRight} alt="" />} iconPlacement="right">Next</Button>
          </Link>
        </CTags.MotionDivWrapper>
      </CTags.ContentWrapper>
      <CTags.BrowserCon
        src={Browser}
        alt="browser illustration"
      />
    </>

  );
}
