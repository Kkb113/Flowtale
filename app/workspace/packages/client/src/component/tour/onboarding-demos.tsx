import { OnboardingTourForPrev } from '@fable/common/dist/api-contract';
import React from 'react';
import styled from 'styled-components';
import { traceEvent } from '@fable/common/dist/amplitude';
import FableLogo from '../../assets/fable-rounded-icon.svg';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc } from '../../utils';

interface Props {
  layout: 'row' | 'column',
  previewTours: OnboardingTourForPrev[]
}

const ICONS = ['marketing', 'sales', 'support'];
export default function OnboardingDemos(props: Props) {
  return (
    <Con layout={props.layout}>
      <h3>Demos we have created for you using Fable</h3>
      <div style={{
        display: 'flex',
        flexDirection: props.layout,
        gap: '1rem'
      }}
      >
        {props.previewTours.map((tour, i) => (
          <PreviewCard
            href={`/live/demo/${tour.rid}`}
            target="_blank"
            rel="noreferrer"
            key={tour.rid}
            onClick={() => {
              traceEvent(
                AMPLITUDE_EVENTS.SAMPLE_DEMO_CLICKED,
                { tour_url: createIframeSrc(`/demo/${tour.rid}`) },
                []
              );
            }}
          >
            <img src={`/${ICONS[i % ICONS.length]}.svg`} alt={tour.name} width={36} />
            <div className="con">
              <div className="title">{tour.name}</div>
              {tour.description && (<div className="description">{tour.description}</div>)}
              <div className="owner">
                <span style={{ fontSize: '12px' }}>
                  Created by
                </span>
                <img style={{ width: '18px' }} src={FableLogo} alt="fable-logo" />
              </div>
            </div>
          </PreviewCard>
        ))}
      </div>
    </Con>
  );
}

export const Con = styled.div<{ layout: string}>`
  border-top: ${props => (props.layout === 'row' ? 'none' : '1px solid #e6e6e6')};
  margin-top: ${props => (props.layout === 'row' ? '0' : '1rem')};
  padding: 0.25rem;
`;

export const PreviewCard = styled.a`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  flex: 1;
  border-radius: 0.5rem;
  max-width: 300px;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  color: #16023E;

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }

  .title {
    font-weight: 600;
  }

  .description {
    line-height: 1rem;
    margin: 4px 0;
  }

  .owner {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 6px;
  }

  .con {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
`;
