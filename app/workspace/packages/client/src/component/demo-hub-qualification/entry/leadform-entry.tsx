import React, { useRef, useState } from 'react';
import { useDemoHubQlfcnCtx } from '../ctx';
import * as GTags from '../../../common-styled';
import { EntryProps } from '../type';
import { LeadFormEntry as LeadFormEntryType } from '../../../types';
import BaseEntry from './base-entry';
// import { getCustomFields, getPrimaryKeyValue } from '../../../utils';
import { isLeadFormPresent, validateInput } from '../../annotation/utils';

interface Props extends EntryProps {
  entryData: LeadFormEntryType;
}

function LeadFormEntry(props: Props): JSX.Element {
  const { config, setLeadFormValues } = useDemoHubQlfcnCtx();
  const conRef = useRef<HTMLDivElement | null>(null);
  const [isFormFilled, setIsFormFilled] = useState(false);

  const processLeadForm = (): boolean => {
    if (conRef.current && isLeadFormPresent(conRef.current)) {
      const leadFormFields = conRef.current?.getElementsByClassName('LeadForm__optionContainer');

      let isValidForm = true;
      const leadForm: Record<string, string | undefined> = {};
      if (leadFormFields) {
        for (const field of Array.from(leadFormFields)) {
          const { isValid, fieldName, fieldValue } = validateInput(field as HTMLDivElement);
          if (!isValid) isValidForm = false;
          leadForm[fieldName] = fieldValue;
        }
      }

      if (!isValidForm) return false;

      // const pk_val = getPrimaryKeyValue(leadForm, config.leadform.primaryKey) || '';
      // const customFields = getCustomFields(leadForm);

      // TODO:: handle leadform data
      setLeadFormValues(leadForm);
    }

    return true;
  };

  return (
    <BaseEntry
      entryBaseData={{
        ...props.entryData,
        title: '',
        desc: '',
      }}
      isVisible={props.isVisible}
      hideContinue={false}
      hideSkip
      goToNext={() => {
        const isValid = processLeadForm();
        if (!isValid) return;
        props.goToNext();
        setIsFormFilled(true);
      }}
      onSkip={props.onSkip}
      hideEndCTA={!(props.isLast && isFormFilled)}
    >
      <GTags.LeadFormEntryCon
        fontColor={props.entryData.style.fontColor}
        borderRadius={props.entryData.style.borderRadius}
        bgColor={props.entryData.style.bgColor}
        fontSizeNormal="1rem"
        fontSizeLarge="1.6rem"
        fontSizeHuge="2.1rem"
        scaleDownLeadForm
        ref={conRef}
      >
        <div dangerouslySetInnerHTML={{ __html: config.leadform.bodyContent }} />
      </GTags.LeadFormEntryCon>
    </BaseEntry>
  );
}

export default LeadFormEntry;
