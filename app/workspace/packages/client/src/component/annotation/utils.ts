import { IAnnotationConfig } from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { IAnnoationDisplayConfig } from '.';
import { Rect } from '../base/hightligher-base';
import { AnnotationPerScreen } from '../../types';
import { AllDimsForAnnotation } from './types';
import { FABLE_LEAD_FORM_FIELD_NAME, FABLE_LEAD_FORM_VALIDATION_FN } from '../../constants';
import { FIELD_NAME_VARIABLE_REGEX,
  LeadFormField,
  OPTION_INPUT_CLASSNAME,
  OPTION_INPUT_IS_OPTIONAL
} from '../annotation-rich-text-editor/utils/lead-form-node-utils';

export const FABLE_RT_UMBRL = 'fable-rt-umbrl';
export const FABLE_RT_UMBRL_WRAPPER = 'fable-rt-umbrl-wrapper';
export const FABLE_SH_HOST = 'fable-sh-host';

export const getFableRtUmbrlDiv = (doc: Document): HTMLDivElement | null => {
  const host = getFableShHost(doc);
  if (!host) return null;

  const shadowRoot = host.shadowRoot!;
  const umbrlDiv = shadowRoot.querySelector(`.${FABLE_RT_UMBRL}`);
  return umbrlDiv as HTMLDivElement;
};

export const getFableShHost = (doc: Document): HTMLDivElement => {
  const umbrlDivShHost = doc.getElementsByClassName(FABLE_SH_HOST)[0];
  return umbrlDivShHost as HTMLDivElement;
};

export const getFableRtUmbrlDivWrapper = (doc: Document): HTMLDivElement => {
  const umbrlDivShHost = doc.getElementsByClassName(FABLE_RT_UMBRL_WRAPPER)[0];
  return umbrlDivShHost as HTMLDivElement;
};

export const createFableRtUmbrlDivWrapper = (doc: Document): HTMLDivElement => {
  const umbrlDivShHost = doc.createElement('div');
  umbrlDivShHost.style.setProperty('display', 'block', 'important');
  umbrlDivShHost.style.setProperty('visibility', 'visible', 'important');
  umbrlDivShHost.style.setProperty('opacity', '1', 'important');
  umbrlDivShHost.classList.add(FABLE_RT_UMBRL_WRAPPER);
  umbrlDivShHost.appendChild(createOverrideDivEmptyStyleEl(doc));
  umbrlDivShHost.appendChild(createFableShHost(doc));
  doc.body.appendChild(umbrlDivShHost);
  return umbrlDivShHost;
};

export const createFableShHost = (doc: Document): HTMLDivElement => {
  const fableShHost = doc.createElement('div');
  fableShHost.attachShadow({ mode: 'open' });
  const shadowRoot = fableShHost.shadowRoot!;
  fableShHost.classList.add(FABLE_SH_HOST);
  shadowRoot.appendChild(createOverrideStyleEl(doc));
  shadowRoot.appendChild(createFablrRtUmbrlDiv(doc));
  return fableShHost;
};

export const createFablrRtUmbrlDiv = (doc: Document): HTMLDivElement => {
  const htmlElementLeftOffset = getHTMLElLeftOffset(doc);

  const umbrellaDiv = doc.createElement('div');
  umbrellaDiv.setAttribute('class', FABLE_RT_UMBRL);
  umbrellaDiv.style.position = 'absolute';
  umbrellaDiv.style.left = `-${htmlElementLeftOffset}px`;
  umbrellaDiv.style.top = `${0}`;
  umbrellaDiv.style.setProperty('display', 'block', 'important');

  // This iframe was added to support autocomplete posting when lead form is present.
  // This is how leadform values are saved in browser for autocomplete. Ref: https://stackoverflow.com/a/29885896
  const iframeEl = createEmptyFableIframe();
  umbrellaDiv.appendChild(iframeEl);

  return umbrellaDiv;
};

export const getHTMLElLeftOffset = (doc : Document) : number => {
  const htmlEl = doc.documentElement;
  if (!htmlEl) return 0;

  const htmlElRect = htmlEl.getBoundingClientRect();
  const htmlElLeftOffset = htmlElRect.left;

  return htmlElLeftOffset || 0;
};

export const DEFAULT_DIMS_FOR_ANN: AllDimsForAnnotation = {
  dimForSmallAnnotation: { w: 10, h: 10 },
  dimForMediumAnnotation: { w: 10, h: 10 },
  dimForLargeAnnotation: { w: 10, h: 10 },
  dimForCustomAnnotation: { w: 10, h: 10 },
};

export const scrollToAnn = (win: Window, boxRect: Rect, annDisplayConfig: IAnnoationDisplayConfig): void => {
  const doc = win.document;

  const pageHeight = doc.body.offsetHeight;
  const windowHeight = win.innerHeight;

  // ann can be placed at the top of the element or the bottom of the element
  // for calculation, we will consider the ann window such that the ann can be placed at the top or at the bottom
  const annWindowStartingY = boxRect.y - annDisplayConfig.dimForLargeAnnotation.h;
  const annWindowEndingY = boxRect.y + boxRect.height + annDisplayConfig.dimForLargeAnnotation.h;

  // if the box with ann is in the view port don't scroll
  if (annWindowStartingY >= win.scrollY && annWindowEndingY <= win.scrollY + windowHeight) {
    return;
  }

  // if ann is at top, scroll to extreme top
  if (annWindowStartingY < 0) {
    win.scrollTo(0, 0);
    return;
  }

  // if ann at lower end -> scroll to extreme bottom
  if (annWindowEndingY > pageHeight) {
    win.scrollTo(0, pageHeight);
    return;
  }

  // case -> scroll such that the ann window is in center
  const winHalfSection = win.innerHeight / 2;
  const annWindowHeight = annWindowEndingY - annWindowStartingY;
  const annWindowMid = annWindowHeight / 2;

  const scrollStart = annWindowStartingY + annWindowMid - winHalfSection;

  win.scrollTo(0, scrollStart);
};

const extractRGBValues = (color: string): number[] => color.match(/\d+/g)!.map(Number);

const expandHexValues = (hexValue: string): string => {
  const expandedHexValue = hexValue
    .split('')
    .map(char => char + char)
    .join('');

  return expandedHexValue;
};

const extractHexValuesToRGB = (color: string): number[] => {
  let hexValue = color.replace(/#/g, '');

  if (hexValue.length === 3) {
    hexValue = expandHexValues(hexValue);
  }

  let r = parseInt(hexValue.substring(0, 2), 16);
  let g = parseInt(hexValue.substring(2, 4), 16);
  let b = parseInt(hexValue.substring(4, 6), 16);

  if (r === 0) r = 32;
  if (g === 0) g = 32;
  if (b === 0) b = 32;
  return [r, g, b];
};

const extractColorValuesInRgb = (color: string): number[] => {
  if (color.startsWith('rgb')) {
    return extractRGBValues(color);
  } if (color.startsWith('#')) {
    return extractHexValuesToRGB(color);
  }

  return [];
};

export const getShadedRGBColor = (color: string, percent: number): string => {
  const rgbValues = extractColorValuesInRgb(color);
  const shadedRgb = rgbValues.map(value => {
    let newValue = value + percent;
    newValue = Math.max(0, Math.min(255, newValue));
    return newValue;
  });
  return `rgb(${shadedRgb.join(', ')})`;
};

const calculateLuminance = (color: string): number => {
  const rgbValues = extractColorValuesInRgb(color);

  const [r, g, b] = rgbValues;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance;
};

export const generateShadeColor = (color: string, d = 50): string => {
  const luminance = calculateLuminance(color);
  const percent = luminance > 0.5 ? d * -1 : d;
  return getShadedRGBColor(color, percent);
};

export const generatePointFiveLightShate = (color: string): string => {
  const rgbValues = extractColorValuesInRgb(color);
  const [r, g, b] = rgbValues;
  const lightColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  return lightColor;
};

export const getIframeByScreenId = (screenId: string): HTMLIFrameElement | null => {
  const iframe = document.querySelector(`.fable-iframe-${screenId}`) as HTMLIFrameElement;
  return iframe;
};

export const getAnnotationByRefId = (
  refId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfig | null => {
  for (const screenGroup of allAnnotationsForTour) {
    for (const annotation of screenGroup.annotations) {
      if (annotation.refId === refId) {
        return annotation;
      }
    }
  }
  return null;
};

export const getAnnsOfSameMultiAnnGrp = (
  zId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfig[] => {
  const anns: IAnnotationConfig[] = [];

  for (const screenGroup of allAnnotationsForTour) {
    for (const annotation of screenGroup.annotations) {
      if (annotation.zId === zId) {
        anns.push(annotation);
      }
    }
  }

  return anns;
};

export const isLeadFormPresent = (annConDiv: HTMLDivElement): boolean => {
  const res = Boolean(annConDiv.getElementsByClassName('LeadForm__container').item(0));
  return res;
};

function validateEmail(email: string): boolean {
  const regex = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

function validateText(text: string): boolean {
  return Boolean(text.trim());
}

const validationFnMap: Record<LeadFormField, (value: string) => boolean> = {
  email: validateEmail,
  text: validateText
};

const EMPTY_FIELD_VALIDATION_ERROR = 'Field can\'t be empty';
const INVALID_EMAIL_VALIDATION_ERROR = 'Email format is not valid';

const getValidationErrorMsg = (value: string | undefined, validationType: LeadFormField): string => {
  if (!(value || '').trim()) return EMPTY_FIELD_VALIDATION_ERROR;
  if (validationType === 'email') return INVALID_EMAIL_VALIDATION_ERROR;
  return '';
};

export const validateInput = (field: HTMLDivElement): {
  isValid: boolean,
  fieldName: string,
  fieldValue: string | undefined
} => {
  const inpulEl = field.getElementsByClassName(OPTION_INPUT_CLASSNAME).item(0);
  const isOptional = inpulEl?.classList.contains(OPTION_INPUT_IS_OPTIONAL) || false;

  const validationType = (field.getAttribute(FABLE_LEAD_FORM_VALIDATION_FN) || 'text') as LeadFormField;
  const validationFn = validationFnMap[validationType];
  const fieldValue = (inpulEl as HTMLInputElement).value.trim() || undefined;
  const fieldName = inpulEl?.getAttribute(FABLE_LEAD_FORM_FIELD_NAME) || '';
  const isValid = fieldValue ? validationFn(fieldValue) : isOptional;

  const uid = field.getAttribute('fable-input-field-uid');
  const errorMsgEl = field.querySelector(`[fable-validation-uid="${uid}"]`) as HTMLDivElement;

  if (isValid) hideValidationError(errorMsgEl as HTMLDivElement);
  else showValidationError(errorMsgEl as HTMLDivElement, getValidationErrorMsg(fieldValue, validationType));

  return { isValid, fieldName, fieldValue };
};

export const parseFieldName = (placeholderString: string): string => {
  let nVarName = '';
  const match = placeholderString.match(FIELD_NAME_VARIABLE_REGEX);

  if (match && match[1]) {
    const varName = match[1];
    nVarName = varName.trim().replace(/[\s\W]/g, '_').toLowerCase();
  }

  if (!nVarName) {
    nVarName = placeholderString.trim().replace(/[\s\W]/g, '_').toLowerCase();
  }

  return nVarName;
};

export const showValidationError = (errorMsgEl: HTMLDivElement, message: string): void => {
  if (errorMsgEl) {
    (errorMsgEl as HTMLDivElement).innerText = message;
    (errorMsgEl as HTMLDivElement).style.visibility = 'visible';
  }
};

export const hideValidationError = (errorMsgEl: HTMLDivElement): void => {
  if (errorMsgEl) (errorMsgEl as HTMLDivElement).style.visibility = 'hidden';
};

export const EMPTY_IFRAME_ID = 'fable-empty-iframe';

export const createEmptyFableIframe = (): HTMLIFrameElement => {
  const iframeEl = document.createElement('iframe');
  iframeEl.name = EMPTY_IFRAME_ID;
  iframeEl.style.display = 'none';
  iframeEl.src = 'about:blank';
  iframeEl.title = 'Fable Empty Iframe';
  return iframeEl;
};

export const createOverrideStyleEl = (doc: Document): HTMLStyleElement => {
  const styleEl = doc.createElement('style');
  styleEl.textContent = `
    :host { 
      all: initial; 
      font-family: inherit; 
    }
  `;
  return styleEl;
};

export const createOverrideDivEmptyStyleEl = (doc: Document): HTMLStyleElement => {
  const styleEl = doc.createElement('style');
  styleEl.textContent = `
    .${FABLE_SH_HOST}:empty,
    .${FABLE_SH_HOST} div:empty {
      display: block !important;
    }
  `;
  return styleEl;
};

export async function convertUrlToBlobUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    raiseDeferredError(new Error(`Failed to fetch: ${response.statusText}`));
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
