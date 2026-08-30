import { SimpleStyle } from '../types';
import { AMPLITUDE_EVENTS } from './events';

export const AMPLITUDE_CTA_STYLE: {
    [K in keyof Omit<SimpleStyle, 'borderColor'>]: 'bg_color' | 'font_color' | 'border_radius'
} = {
  bgColor: 'bg_color',
  fontColor: 'font_color',
  borderRadius: 'border_radius',
  bgColorProp: 'bg_color'
} as const;

export const AMPLITUDE_COLLECTION_CARD_STYLE: {
    [K in keyof SimpleStyle]: 'card_bg_color' | 'card_font_color' | 'card_border_radius' | 'card_border_color'
} = {
  bgColor: 'card_bg_color',
  fontColor: 'card_font_color',
  borderRadius: 'card_border_radius',
  borderColor: 'card_border_color'
} as const;

export const AMPLITUDE_COLLECTION_CARD_CTA_STYLE: {
  [K in keyof SimpleStyle]: 'card_cta_bg_color' | 'card_cta_font_color' |
  'card_cta_border_radius' | 'card_cta_border_color'
} = {
  bgColor: 'card_cta_bg_color',
  fontColor: 'card_cta_font_color',
  borderRadius: 'card_cta_border_radius',
  borderColor: 'card_cta_border_color'
} as const;

export const AMPLITUDE_SIMPLE_STYLE: {
    [K in keyof SimpleStyle]: 'bg_color' | 'font_color' | 'border_radius' | 'border_color'
} = {
  bgColor: 'bg_color',
  fontColor: 'font_color',
  borderRadius: 'border_radius',
  borderColor: 'border_color',
  bgColorProp: 'bg_color'
} as const;

export const AMPLITUDE_LEADFORM_CONTINUE_BTN_STYLE: {
    [K in keyof Omit<SimpleStyle, 'borderColor'>]:
     'leadform_btn_bg_color' | 'leadform_btn_font_color' | 'leadform_btn_border_radius'
} = {
  bgColor: 'leadform_btn_bg_color',
  fontColor: 'leadform_btn_font_color',
  borderRadius: 'leadform_btn_border_radius',
  bgColorProp: 'leadform_btn_bg_color'
} as const;

export const AMPLITUDE_COLLECTION_MODAL_STYLE: {
    [K in keyof SimpleStyle]: 'modal_bg_color' | 'modal_font_color' | 'modal_border_radius' | 'modal_border_color'
} = {
  bgColor: 'modal_bg_color',
  fontColor: 'modal_font_color',
  borderRadius: 'modal_border_radius',
  borderColor: 'modal_border_color',
  bgColorProp: 'modal_bg_color'
} as const;

export interface DemoQualBodyEditEvent {
  type : AMPLITUDE_EVENTS.DEMO_QUALIFICATION_BODY_EDITED,
  payload : {
    demo_qualification_body_prop:
    'title' | 'bg_color' | 'font_color' | 'cta_select' | 'cta_delete' | 'qualification_add' |
    'qualification_delete' | 'qualification_edit',
    demo_qualification_body_value: string | boolean,
  }
}

export interface DemoQualEditEvent {
  type : AMPLITUDE_EVENTS.DEMO_QUALIFICATION_EDITED,
  payload : {
    qualification_id: string,
    demo_qualification_prop: 'general_title'| 'sidepanel_cta_select' | 'sidepanel_cta_delete' |
    'qualification_end_cta_select' | 'qualification_end_cta_delete' | 'step_add' |
    'step_edit' | 'step_delete' | 'card_bg_color' | 'card_border_color' |
    'card_font_color' | 'card_border_radius' | 'container_accent_color' | 'container_border_color'
    | 'container_font_color',
    demo_qualification_value: string | boolean | null | number
  }
}

export interface QualStepEditEvent {
  type : AMPLITUDE_EVENTS.QUALIFICATION_STEP_EDITED,
  payload : {
    step_type: 'single_select' | 'multi_select' | 'text' | 'leadform',
    step_id : string,
    qualification_step_prop: 'general_title' | 'general_description' | 'general_bg_color' |
    'general_accent_color' | 'general_font_color' | 'general_border_radius' | 'continue_cta_text' |
     'continue_cta_placement' | 'continue_cta_btn_type' | 'continue_cta_font_color' | 'continue_cta_border_radius' |
     'skip_cta_text' | 'skip_cta_placement' | 'skip_cta_btn_type' | 'skip_cta_font_color' |
     'skip_cta_border_radius' | 'skip_cta_show' | 'option_add' | 'option_edit' | 'option_delete'

    qualification_step_value: string | boolean,
  }
}

export interface QualStepOptionEditEvent {
  type : AMPLITUDE_EVENTS.QUALIFICATION_STEP_OPTION_EDITED,
  payload : {
    step_id: string,
    option_id: string,
    step_option_prop: 'title' | 'description' | 'demo_add' | 'demo_reload' | 'demo_delete',
    step_option_value: string | boolean,
  }
}

export interface DemohubLeadFormEvent {
  type : AMPLITUDE_EVENTS.DEMOHUB_LEADFORM,
  payload : {
    action: 'create' | 'edit' | 'delete',
  }
}

export interface DemohubDeveloperEvent {
  type : AMPLITUDE_EVENTS.DEMOHUB_LEADFORM,
  payload : {
    action: 'edit_custom_script' | 'edit_custom_style',
  }
}

export const AMPLITUDE_HEADER_STYLE : {
  [K in keyof Omit<SimpleStyle, 'borderRadius' | 'borderColor'>]:
  DemoQualBodyEditEvent['payload']['demo_qualification_body_prop'] } = {
    bgColor: 'bg_color',
    fontColor: 'font_color'
  } as const;

export const AMPLITUDE_SIDEPANEL_CARD_STYLE : {
  [K in keyof SimpleStyle]: DemoQualEditEvent['payload']['demo_qualification_prop'] } = {
    bgColor: 'card_bg_color',
    borderColor: 'card_border_color',
    borderRadius: 'card_border_radius',
    fontColor: 'card_font_color'
  } as const;

export const AMPLITUDE_SIDEPANEL_CON_STYLE : {
  [K in keyof Omit<SimpleStyle, 'borderRadius'>]: DemoQualEditEvent['payload']['demo_qualification_prop'] } = {
    bgColor: 'container_accent_color',
    borderColor: 'container_border_color',
    fontColor: 'container_font_color'
  } as const;

export const AMPLITUDE_STEP_TYPE = {
  'single-select': 'single_select',
  'multi-select': 'multi_select',
  'text-entry': 'text',
  'leadform-entry': 'leadform'
} as const;

export const AMPLITUDE_STEP_STYLE : {
  [K in keyof SimpleStyle]: QualStepEditEvent['payload']['qualification_step_prop'] } = {
    bgColor: 'general_bg_color',
    borderColor: 'general_accent_color',
    fontColor: 'general_font_color',
    borderRadius: 'general_border_radius'
  } as const;

export const AMPLITUDE_STEP_CONTINUE_STYLE : {
  [K in keyof Omit<SimpleStyle, 'bgColor' | 'borderColor'>]:
  QualStepEditEvent['payload']['qualification_step_prop'] } = {
    fontColor: 'continue_cta_font_color',
    borderRadius: 'continue_cta_border_radius'
  } as const;

export const AMPLITUDE_STEP_SKIP_STYLE : {
  [K in keyof Omit<SimpleStyle, 'bgColor' | 'borderColor'>]:
  QualStepEditEvent['payload']['qualification_step_prop'] } = {
    fontColor: 'skip_cta_font_color',
    borderRadius: 'skip_cta_border_radius'
  } as const;

export interface Amp_Create_DH_Evt {
  type: AMPLITUDE_EVENTS.CREATE_NEW_DEMO_HUB,
  payload: {
    value: string,
  }
}

export interface Amp_Rename_DH_Evt {
  type: AMPLITUDE_EVENTS.RENAME_DEMO_HUB,
  payload: {
    value: string,
    new_value: string,
    demo_hub_rid: string,
    new_demo_hub_rid: string,
  }
}

export interface Amp_Del_DH_Evt {
  type: AMPLITUDE_EVENTS.DELETE_DEMO_HUB,
  payload: {
    demo_hub_rid: string,
  }
}

export interface Amp_Preview_DH_Evt {
  type: AMPLITUDE_EVENTS.PREVIEW_DEMO_HUB,
  payload: {
    clicked_from: 'header' | 'card',
    demo_hub_rid: string,
  }
}

export interface Amp_Publish_DH_Evt {
  type: AMPLITUDE_EVENTS.PUBLISH_DEMO_HUB,
  payload: {
    clicked_from: 'editor' | 'preview' | 'card',
    demo_hub_rid: string,
  }
}

export interface Amp_Share_DH_Evt {
  type: AMPLITUDE_EVENTS.SHARE_DEMO_HUB,
  payload: {
    clicked_from: 'editor' | 'preview' | 'card',
    demo_hub_rid: string,
  }
}

export interface Amp_Edit_DH_Evt {
  type: AMPLITUDE_EVENTS.EDIT_DEMO_HUB,
  payload: {
    clicked_from: 'preview' | 'card',
    demo_hub_rid: string,
  }
}

export type AmplitudeDHDataEvent = Amp_Create_DH_Evt | Amp_Rename_DH_Evt | Amp_Del_DH_Evt |
                                  Amp_Preview_DH_Evt | Amp_Publish_DH_Evt | Amp_Share_DH_Evt | Amp_Edit_DH_Evt;
