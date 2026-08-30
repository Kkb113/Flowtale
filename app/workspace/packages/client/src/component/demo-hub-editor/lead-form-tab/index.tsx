import React from 'react';
import Button from '../../button';
import * as GTags from '../../../common-styled';
import AnnotationRichTextEditor from '../../annotation-rich-text-editor';
import { useEditorCtx } from '../ctx';
import { IDemoHubConfig } from '../../../types';
import { amplitudeDemohubLeadForm } from '../../../amplitude';

const DEFAULT_LEAD_FORM_BODY_CONTENT = '<p class="editor-paragraph"><span data-lexical-lead-form-options="[{&quot;text&quot;:&quot;Enter your Email {[email]}&quot;,&quot;uid&quot;:&quot;1720530350987c747be559a&quot;,&quot;type&quot;:&quot;email&quot;,&quot;autocompleteType&quot;:&quot;email&quot;,&quot;property&quot;:0,&quot;calculatedValue&quot;:&quot;&quot;}]" class="LeadForm__container" id="fable-lead-form"><span class="LeadForm__inner"><span class="LeadForm__optionContainer" fable-input-field-uid="1720530350987c747be559a" fable-x-f-vfn="email"><span class="LeadForm__optionInputWrapper"><input class="LeadForm__optionInputInAnn" fable-input-uid="1720530350987c747be559a" fable-lead-form-field-name="email" type="text" placeholder="Enter your Email" id="email" name="email" autocomplete="email"></span><span class="LeadForm__inputValidation" fable-validation-uid="1720530350987c747be559a">Error msg</span></span></span></span></p>';
const DEFAULT_LEAD_FORM_DISPLAY_TEXT = '';

export default function LeadformTab(): JSX.Element {
  const { config, onConfigChange, data, updateDemoHubProp } = useEditorCtx();

  const updateLeadformPrimaryKey = (
    primaryKey: string
  ): void => {
    onConfigChange(c => ({
      ...c,
      leadform: {
        ...c.leadform,
        primaryKey,
      },
    }));

    updateDemoHubProp(data.rid, 'settings', {
      primaryKey,
      vpdHeight: data.settings?.vpdHeight || 0,
      vpdWidth: data.settings?.vpdWidth || 0
    });
  };

  const deleteLeadformEntry = (): void => {
    onConfigChange(c => {
      const qfns = c.qualification_page.qualifications.map(qfn => {
        const entries = qfn.entries;

        return ({
          ...qfn,
          entries: entries.filter(entry => entry.type !== 'leadform-entry')
        });
      });

      return {
        ...c,
        qualification_page: {
          ...c.qualification_page,
          qualifications: qfns,
        }
      };
    });
  };

  function updateSeeAllLeadformProps<K extends keyof IDemoHubConfig['see_all_page']['leadForm']>(
    key: K,
    value: IDemoHubConfig['see_all_page']['leadForm'][K]
  ): void {
    onConfigChange(c => ({
      ...c,
      see_all_page: {
        ...c.see_all_page,
        leadForm: {
          ...c.see_all_page.leadForm,
          [key]: value,
        }
      }
    }));
  }

  const updateLeadformBodyContentAndDisplayText = (
    bodyContent: string,
    displayText: string,
  ): void => {
    onConfigChange(c => ({
      ...c,
      leadform: {
        ...c.leadform,
        bodyContent,
        displayText,
      },
    }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1rem 2rem',
      }}
    >
      {config.leadform.bodyContent && (
      <div
        style={{
          background: 'white',
          borderRadius: '1rem',
          border: '1px solid #DDD',
          padding: '1rem 1rem 0 1rem',
          width: '100%',
          height: '280px',
          overflowY: 'auto'
        }}
      >
        <AnnotationRichTextEditor
          lfPkf={config.leadform.primaryKey}
          subs={null}
          throttledChangeHandler={(htmlString, displayText) => {
            amplitudeDemohubLeadForm({
              action: 'edit'
            });
            updateLeadformBodyContentAndDisplayText(htmlString, displayText);
          }}
          defaultValue={config.leadform.bodyContent}
          leadFormFeatureAvailable={{ isAvailable: true, isInBeta: false, requireAccess: false }}
          updatePrimaryKey={updateLeadformPrimaryKey}
        />
      </div>
      )}

      {config.leadform.bodyContent ? (
        <>
          <GTags.OurLink
            style={{
              margin: '1rem 0',
              color: '#ff7450',
              fontWeight: 500
            }}
            onClick={() => {
              amplitudeDemohubLeadForm({
                action: 'delete'
              });
              updateLeadformBodyContentAndDisplayText('', '');
              updateLeadformPrimaryKey('email');
              updateSeeAllLeadformProps('showLeadForm', false);
              updateSeeAllLeadformProps('skipLeadForm', false);
              deleteLeadformEntry();
            }}
          >
            Delete this lead form
          </GTags.OurLink>
          <p className="typ-sm" style={{ margin: '0 0 1rem', textAlign: 'center' }}>
            Go to <i>Editor &gt; Demo Collection Page</i> or <i>Editor &gt; Qualification Page</i> to add the lead form.
          </p>
        </>
      ) : (
        <>
          <p className="typ-sm" style={{ margin: '0.25rem 0' }}>
            Create a lead form that can be used to capture buyer information.
          </p>
          <p className="typ-sm" style={{ margin: '0.25rem 0' }}>
            The lead form can be added to the demo collection page after its creation.
          </p>
          <p className="typ-sm" style={{ margin: '0.25rem 0 1rem' }}>
            It can also be added as a qualification step that the buyer encounters when they reach that particular step.
          </p>
          <Button
            intent="secondary"
            onClick={() => {
              amplitudeDemohubLeadForm({
                action: 'create'
              });
              updateLeadformBodyContentAndDisplayText(DEFAULT_LEAD_FORM_BODY_CONTENT, DEFAULT_LEAD_FORM_DISPLAY_TEXT);
              updateLeadformPrimaryKey('email');
            }}
          >
            Create a lead form
          </Button>
        </>
      )}
    </div>
  );
}
