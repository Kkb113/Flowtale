import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Tick from '../../../../assets/onboarding/tick.svg';
import GreenTick from '../../../../assets/onboarding/green-tick.png';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import * as CTags from '../../styled';
import * as Tags from './styled';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/go-to-app-browser.png';
import { TALK_TO_US_LINK } from '../../../../constant';

interface Props {
  title: string,
}

export default function ProductTours(props: Props): JSX.Element {
  useEffect(() => {
    document.title = props.title;
  }, []);

  return (
    <>
      <CTags.ContentWrapper>
        <CTags.FlexColContainer>
          <img
            src={GreenTick}
            alt=""
            width={48}
            style={{
              display: 'block'
            }}
          />
          <CTags.Header>
            You are all set!
          </CTags.Header>
          <CTags.Subtitle>
            Head to the Fable app and start creating your first interactive demo.
          </CTags.Subtitle>
          <CTags.FlexColContainer>
            <Tags.CardCon>
              <Tags.CardTitle>
                Chrome Extention
              </Tags.CardTitle>
              <Button
                type="button"
                style={{ cursor: 'default', backgroundColor: '#E6E6E6', color: '#555555', transform: 'none' }}
                icon={<img src={Tick} alt="" />}
                iconPlacement="left"
              >
                Installed
              </Button>
            </Tags.CardCon>

            <Tags.CardCon>
              <Tags.CardTitle>
                Get started
              </Tags.CardTitle>
              <Link
                to="/"
                style={{
                  textDecoration: 'none'
                }}
              >
                <Button
                  icon={<img src={ArrowRight} alt="" height={17} />}
                  iconPlacement="right"
                >
                  Go to app
                </Button>
              </Link>
            </Tags.CardCon>

          </CTags.FlexColContainer>
        </CTags.FlexColContainer>

        <CTags.StepDotsWrapper>
          Need help?
          <CTags.Link
            href={TALK_TO_US_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            Talk to us
          </CTags.Link>
        </CTags.StepDotsWrapper>
      </CTags.ContentWrapper>
      <CTags.BrowserCon
        src={Browser}
        alt="browser illustration"
      />
    </>

  );
}
