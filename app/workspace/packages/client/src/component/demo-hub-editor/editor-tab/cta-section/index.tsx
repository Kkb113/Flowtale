import React from 'react';
import { PlusOutlined, StepBackwardOutlined } from '@ant-design/icons';
import { useEditorCtx } from '../../ctx';
import { OurLink } from '../../../../common-styled';
import { CTAPrevConfig, getSampleCTASimpleStyle, getSampleDemoHubConfigCta } from '../../../../utils';
import ActionPanel from '../../../screen-editor/action-panel';
import CtaWrapper from './cta-wrapper';
import { amplitudeDemoHubCta } from '../../../../amplitude';

function CTASection(): JSX.Element {
  const { config, onConfigChange, globalConfig } = useEditorCtx();

  const addNewCta = (): void => {
    let ctaId = '';
    onConfigChange(c => {
      const lastCTAStyle = c.cta.at(-1)?.style || getSampleCTASimpleStyle(globalConfig);

      const prevConfig: CTAPrevConfig = {
        borderRadius: lastCTAStyle.borderRadius,
        fontColor: lastCTAStyle.fontColor
      };

      const newConfig = {
        ...c,
        cta: [...c.cta, getSampleDemoHubConfigCta(prevConfig, globalConfig)]
      };

      ctaId = newConfig.cta.at(-1)!.id;

      return newConfig;
    });

    amplitudeDemoHubCta('add', ctaId);
  };

  const deleteCta = (id: string): void => {
    onConfigChange(c => {
      const ctaIndex = c.cta.findIndex(cta => cta.id === id);
      if (ctaIndex >= 0) c.cta.splice(ctaIndex, 1);

      const ctaIdToBeDeleteIdxInHeader = c.see_all_page.header.ctas.findIndex(cta => cta === id);
      if (ctaIdToBeDeleteIdxInHeader >= 0) c.see_all_page.header.ctas.splice(ctaIdToBeDeleteIdxInHeader, 1);

      const ctaIdToBeDeleteIdxInQualificationPageHeader = c.qualification_page.header.ctas.findIndex(cta => cta === id);
      if (ctaIdToBeDeleteIdxInQualificationPageHeader >= 0) c.qualification_page.header.ctas.splice(ctaIdToBeDeleteIdxInQualificationPageHeader, 1);

      for (let i = 0; i < c.qualification_page.qualifications.length; i++) {
        const endCtaIdToBeDeleteIdx = c.qualification_page.qualifications[i].qualificationEndCTA.findIndex(cta => cta === id);
        if (endCtaIdToBeDeleteIdx >= 0) c.qualification_page.qualifications[i].qualificationEndCTA.splice(endCtaIdToBeDeleteIdx, 1);
      }

      return {
        ...c,
        cta: [...c.cta],
        see_all_page: {
          ...c.see_all_page,
          header: {
            ...c.see_all_page.header,
            ctas: [...c.see_all_page.header.ctas],
          },
        },
      };
    });

    amplitudeDemoHubCta('delete', id);
  };

  return (
    <>
      <ActionPanel
        title="CTA"
      >
        <p className="typ-sm">
          Configure call-to-action buttons that can be used across the demo hub
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            margin: '8px 0',
          }}
        >
          {config.cta.map((cta, i) => (
            <CtaWrapper
              key={i}
              showEditOption
              deleteCtaHandler={deleteCta}
              cta={cta}
              deletable={cta.deletable}
            />
          ))}
        </div>

        <OurLink
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            margin: 0,
            marginTop: '1rem'
          }}
          onClick={addNewCta}
        >
          <PlusOutlined />
          <div>
            Create a new CTA
          </div>
        </OurLink>
      </ActionPanel>
    </>
  );
}

export default CTASection;
