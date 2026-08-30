import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Segmented } from 'antd';
import { IDemoHubConfig, P_RespDemoHub } from '../../types';
import Button from '../button';
import * as Tags from './styled';
import { SEE_ALL_SLUG } from '../../container/preview-demo-hub';
import MacFrame from '../display-frame/mac';

interface Props {
  demoHubConfig: IDemoHubConfig;
  width: string;
  height: string;
  previewUrl: string;
  activeSlug: string;
}

function DemoHubPreview(props: Props): JSX.Element {
  const navigate = useNavigate();

  const updateSlug = (slug: string): void => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.set('q', slug);
    const updatedUrl = url.pathname + url.search;
    navigate(updatedUrl);
  };

  return (
    <>
      <Tags.ButtonCon>
        <Segmented
          size="middle"
          defaultValue={props.activeSlug}
          options={[{
            label: 'See all page',
            value: SEE_ALL_SLUG
          },
          ...props.demoHubConfig.qualification_page.qualifications.map(q => ({
            label: q.title,
            value: q.slug
          }))
          ]}
          onChange={(value) => {
            updateSlug(value as string);
          }}
        />
      </Tags.ButtonCon>
      <MacFrame
        style={{
          height: props.height,
          width: props.width,
          margin: '2rem auto'
        }}
      >
        <Tags.PreviewIFrame
          src={`${window.location.origin}/hub/${props.previewUrl}?staging=true`}
          title="Preview"
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </MacFrame>
    </>
  );
}

export default DemoHubPreview;
