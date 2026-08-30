import { FABLE_LEAD_FORM_ID } from '../../../constants';

export const FIELD_NAME_VARIABLE_REGEX = /\{\[(.*)\]\}/;
export type LeadFormFieldAutocompleteType = 'email' | 'given-name' | 'family-name' | 'country-name' |
'organization' | 'tel' | 'on';
export type LeadFormField = 'email' | 'text';
export const OPTION_INPUT_CLASSNAME = 'LeadForm__optionInputInAnn';
export const OPTION_INPUT_IS_OPTIONAL = 'LeadForm__optionInputIsOptional';

export const removeFieldNameDefinition = (placeholderString: string): string => {
  const res = placeholderString.replace(FIELD_NAME_VARIABLE_REGEX, '').trim();
  return res;
};

export const isLeadFormPresentInHTMLStr = (htmlStr: string): boolean => {
  const dp = new DOMParser();
  const dom = dp.parseFromString(htmlStr, 'text/html');
  return dom.getElementById(FABLE_LEAD_FORM_ID) !== null;
};
