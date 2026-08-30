import React from 'react';
import styled from 'styled-components';
import { Tabs } from 'antd';
import GeneralSection from './general-section';
import SeeAllPageTab from './see-all-tab';
import QualificationTab from './qualification-tab';
import * as Tags from '../styled';
import CTASection from './cta-section';
import { useEditorCtx } from '../ctx';

const InfoBox = styled.div`
  padding: 0.5rem 1rem;

  p {
    margin: 0.5rem 0;
    padding: 0;
    margin-block-start: 0.5rem;
    margin-block-end: 0.5rem;
  }

  ul {
    margin-block-start: 0.5rem;
    margin-block-end: 0.5rem;
  }
`;

function EditorTab(): JSX.Element {
  const { setPreviewUrl, data } = useEditorCtx();

  return (
    <Tags.SidepanelCon>
      <GeneralSection />
      <CTASection />
      <br />
      <InfoBox
        className="typ-sm"
        style={{
          fontWeight: 500,
          opacity: 0.8
        }}
      >
        <p>
          There are two types of pages in the demo hub:
        </p>
        <ul>
          <li style={{ marginBottom: '0.25rem' }}><b>Demo Collection Page:</b> Used to list a collection of demos in a single page</li>
          <li><b>Qualification Page:</b> Used to present buyers with various criteria to create a personalized demo journey</li>
        </ul>
        <p>
          Configure the above pages in the following section.
        </p>
      </InfoBox>
      <br />
      <Tabs
        className="ht"
        centered
        type="card"
        defaultActiveKey="see-all-page"
        items={[
          {
            label: <span className="typ-reg">Demo Collection Page</span>,
            children: <SeeAllPageTab />,
            key: 'see-all-page',
          },
          {
            label: <span className="typ-reg">Qualification Page</span>,
            children: <QualificationTab />,
            key: 'qualification',
          },
        ]}
        onChange={e => {
          if (e === 'see-all-page') {
            setPreviewUrl(`seeall/${data.rid}?lp=true`);
          } else {
            setPreviewUrl(`q/${data.rid}?lp=true`);
          }
        }}
      />
    </Tags.SidepanelCon>
  );
}

export default EditorTab;
