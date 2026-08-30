import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp, ScrollAdjustmentType } from '@fable/common/dist/types';
import { Responsiveness } from '@fable/common/dist/api-contract';
import { AMPLITUDE_EVENTS } from './events';
import { ScreenMode, SiteData } from '../types';
import {
  DemohubDeveloperEvent, DemohubLeadFormEvent, DemoQualBodyEditEvent,
  DemoQualEditEvent, QualStepEditEvent, QualStepOptionEditEvent,
  Amp_Edit_DH_Evt, Amp_Preview_DH_Evt, Amp_Publish_DH_Evt, Amp_Share_DH_Evt, AmplitudeDHDataEvent,
} from './types';

export const enum propertyCreatedFromWithType {
  CANVAS_PLUS_ICON_COVER_NEW_SCREEN = 'canvas_plus_icon_cover_new_screen',
  CANVAS_PLUS_ICON_COVER_SAME_SCREEN = 'canvas_plus_icon_cover_same_screen',
  TIMELINE_PLUS_ICON_COVER_SAME_SCREEN = 'timeline_plus_icon_cover_same_screen',
  TIMELINE_PLUS_ICON_COVER_NEW_SCREEN = 'timeline_plus_icon_cover_new_screen',
  DOM_EL_PICKER = 'dom_el_picker',
  IMG_DRAG_RECT = 'img_drag_rect',
  COVER_ANN_BTN = 'cover_ann_btn'
}

export const amplitudeAddScreensToTour = (
  newScreensLength: number,
  from: 'ext' | 'app'
): void => {
  traceEvent(AMPLITUDE_EVENTS.ADD_SCREENS_TO_TOUR, {
    num_screens_added: newScreensLength,
    from
  }, [CmnEvtProp.TOUR_URL, CmnEvtProp.EMAIL]);
};

export const amplitudeNewAnnotationCreated = (
  createdFromWithType: propertyCreatedFromWithType,
): void => {
  traceEvent(AMPLITUDE_EVENTS.NEW_ANNOTATION_CREATED, {
    created_from_with_type: createdFromWithType,
  }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
};

export const amplitudeScreenEdited = (
  editedProp: 'text' | 'show_or_hide_el' | 'blur_el' | 'mask_el' | 'replace_image',
  editedPropValue: string | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.SCREEN_EDITED,
    { edited_prop: editedProp, edited_prop_value: editedPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeAnnotationEdited = (
  annotationProp: 'text' | 'box_sizing' | 'branding-primary_color' | 'branding-background_color' |
    'branding-selection_shape' | 'branding-border_color' |
    'branding-font_color' | 'branding-selection_color' | 'branding-font_family' | 'branding-button_layout' |
    'branding-padding' | 'branding-border_radius' | 'add_new_cta' | 'cta-button_style' | 'cta-button_size' |
    'cta-button_text' | 'hide_cta' | 'add_link_to_cta' | 'hotspot-interactive_element' | 'hotspot-hide_annotation' |
    'hotspot-nested_element' | 'entry_point' | 'overlay' | 'show-step_num' | 'advanced-reduce_motion_for_mobile',
  annotationPropValue: string | number | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.ANNOTATION_EDITED,
    { annotation_prop: annotationProp, annotation_prop_value: annotationPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeAnnotationApplyAll = (
  applyTo: 'module' | 'all',
  annotationProp: 'branding-selection_color' | 'branding-selection_shape' | 'cta-button_size' | 'overlay'
    | 'branding-selection_effect' | 'cta-button_text',
  annotationPropValue: string | number | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.ANNOTATION_APPLY_ALL,
    { apply_to: applyTo, annotation_prop: annotationProp, annotation_prop_value: annotationPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeShareModalOpen = (
  shareModalClickedFrom: 'demos' | 'editor' | 'preview' | 'analytics'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.SHARE_MODAL_OPEN,
    { share_modal_clicked_from: shareModalClickedFrom },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeCtaConfigChanged = (
  ctaConfigName: keyof SiteData,
  ctaConfigValue: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.CTA_LINK_SITE_CONFIG_CHANGED,
    { cta_config_name: ctaConfigName, cta_config_value: ctaConfigValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeRemoveWatermark = (
  from: 'sharemodal' | 'acp'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.REMOVE_WATERMARK,
    { remove_watermark_from: from },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeOpenResponsivenessDrawer = (): void => {
  traceEvent(
    AMPLITUDE_EVENTS.OPEN_MOBILE_RESPONSIVENESS_DRAWER,
    {},
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeResponsivenessSelectRadio = (
  value: Responsiveness.NoResponsive | Responsiveness.Responsive
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.MOBILE_RESPONSIVENESS_SELECT_RADIO,
    {
      value,
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeResponsivenessChange = (
  value: Responsiveness.NoResponsive | Responsiveness.Responsive,
  source: 'canvas-menu-item-drawer' | 'annotation-editor'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.MOBILE_RESPONSIVENESS_CHANGE,
    {
      value,
      source,
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeDeviceModeChange = (
  value: ScreenMode.DESKTOP | ScreenMode.MOBILE,
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEVICE_MODE_CHANGED,
    {
      value,
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeReselectElement = (): void => {
  traceEvent(
    AMPLITUDE_EVENTS.RESELECT_ELEMENT,
    {},
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeIntegrationModalOpened = (
  name: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.INTEGRATION_MODAL_OPENED,
    {
      value: name,
    },
    [CmnEvtProp.EMAIL]
  );
};

export const amplitudeScrollAdjustmentChanged = (
  value: ScrollAdjustmentType,
  demoUrl: string,
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.SCROLL_ADJUSTMENT_CHANGED,
    {
      demo_url: demoUrl,
      value,
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeDemoHubGeneralSectionEdited = (
  demoHubConfig: 'company_logo' | 'company_name' | 'base_font_size' | 'font_family',
  value: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.GENERAL_SECTION_EDITED,
    {
      demo_hub_config: demoHubConfig,
      demo_hub_value: value
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

interface demoHubCTAEventProperites {
  action: 'add' | 'delete' | 'edit',
  cta_value: string,
  cta_edit_prop?: 'button_text' | 'button_type' | 'border_radius' | 'font_color' | 'bg_color' | 'button_link',
  cta_edit_value?: string | number
}

export const amplitudeDemoHubCta = (
  action: 'add' | 'delete' | 'edit',
  value: string,
  cta_edit_prop?: 'button_text' | 'button_type' | 'border_radius' | 'font_color' | 'bg_color' | 'button_link',
  cta_edit_value?: string | number
): void => {
  let eventProperties: demoHubCTAEventProperites = {
    action,
    cta_value: value,
  };
  if (cta_edit_prop) {
    eventProperties = { ...eventProperties, cta_edit_prop, cta_edit_value };
  }
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_HUB_CTA,
    { ...eventProperties },
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeDemoCollectionHeader = (
  prop: 'title' | 'bg_color' | 'font_color' | 'cta_select' | 'cta_delete',
  value: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_COLLECTION_HEADER_EDITED,
    {
      demo_collection_header_prop: prop,
      demo_collection_header_value: value
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeDemoCollectionBodyEdited = (
  prop: 'body_title' | 'body_bg_color' | 'body_font_color' | 'card_bg_color' | 'card_border_color' |
  'card_font_color' | 'card_border_radius' | 'card_cta_bg_color' | 'card_cta_font_color' | 'card_cta_text' |
  'card_cta_border_radius' | 'card_cta_border_color' | 'modal_bg_color' | 'modal_border_color' | 'modal_font_color' |
  'modal_border_radius' | 'overlay_bg_color' | 'leadform_show' | 'leadform_skip' | 'leadform_btn_text' |
  'leadform_btn_bg_color' | 'leadform_btn_font_color' | 'leadform_btn_border_radius' | 'section_add' |
  'section_edit' | 'section_delete',
  value: string | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_COLLECTION_BODY_EDITED,
    {
      demo_collection_body_prop: prop,
      demo_collection_body_value: value
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const ampliteDemoCollectionSectionEdited = (
  sectionName: string,
  prop: 'title' | 'description' | 'bg_color' | 'border_color'
  | 'font_color' | 'border_radius' | 'demo_add' | 'demo_reload' | 'demo_delete',
  value: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_COLLECTION_SECTION_EDITED,
    {
      section_name: sectionName,
      demo_collection_section_prop: prop,
      demo_collection_section_value: value
    }
  );
};

export const amplitudeGlobalStyleEdited = (
  prop: 'company_logo' | 'company_url' | 'demo_loading_text' | 'font_family' | 'cta_btn_size' | 'cta_btn_color' |
    'body_bg_color' | 'body_border_color' | 'font_color' | 'container_border_radius' | 'container_padding' |
    'selection_color' | 'selection_shape' | 'selection_effect' | 'show_step_number' | 'show_watermark' |
    'next_button_text' | 'next_button_type' | 'prev_button_text' | 'prev_button_type' |
    'custom_cta_text' | 'custom_cta_type' | 'custom_cta_url',
  value: string | number | boolean,
  section: 'common' | 'annotation_style'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.GLOBAL_STYLE_EDITED,
    {
      config_prop: prop,
      config_value: value,
      section
    },
    [CmnEvtProp.EMAIL]
  );
};

export const sendAmplitudeDemoHubDataEvent = (eventData: AmplitudeDHDataEvent): void => {
  traceEvent(
    eventData.type,
    eventData.payload,
    [CmnEvtProp.EMAIL]
  );
};

export const amplitudeDemoQualBodyEdit = (
  payload : DemoQualBodyEditEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_QUALIFICATION_BODY_EDITED,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeApplyGlobalStyles = (
  apply_to: 'annotation' | 'loader' | 'module' | 'demo_hub',
  config_prop: 'cta_primary_color' | 'company_logo' | 'company_url' | 'demo_loading_text' |
  'font_family' | 'cta_btn_size' | 'cta_btn_color' | 'body_bg_color' |
  'body_border_color' | 'font_color' | 'container_border_radius' |
  'container_padding' | 'selection_color' | 'selection_shape' |
  'selection_effect' | 'show_step_number' | 'show_watermark' |
  'next_button_text' | 'next_button_type' | 'prev_button_text' |
  'prev_button_type' | 'custom_cta_text' | 'custom_cta_type' | 'custom_cta_url',
  annotation_id: string | null = null,
  from_demo_hub: boolean = false
) : void => {
  const eventProperties : Record<string, string | boolean | number | null> = { apply_to, config_prop };
  if (annotation_id) {
    eventProperties.annotation_id = annotation_id;
  }

  const commonProperties = [CmnEvtProp.EMAIL];
  if (from_demo_hub) {
    commonProperties.push(CmnEvtProp.DEMO_HUB_RID);
  } else {
    commonProperties.push(CmnEvtProp.TOUR_URL);
  }
  traceEvent(
    AMPLITUDE_EVENTS.APPLY_GLOBAL_STYLE,
    eventProperties,
    commonProperties
  );
};

export const amplitudeDemoQualEdit = (
  payload : DemoQualEditEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMO_QUALIFICATION_EDITED,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeQualStepEdit = (
  payload : QualStepEditEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.QUALIFICATION_STEP_EDITED,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeQualStepOptionEdit = (
  payload : QualStepOptionEditEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.QUALIFICATION_STEP_OPTION_EDITED,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeDemohubLeadForm = (
  payload : DemohubLeadFormEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMOHUB_LEADFORM,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeDemohubDeveloper = (
  payload : DemohubDeveloperEvent['payload']
) : void => {
  traceEvent(
    AMPLITUDE_EVENTS.DEMOHUB_DEVELOPER,
    payload,
    [CmnEvtProp.EMAIL, CmnEvtProp.DEMO_HUB_RID]
  );
};

export const amplitudeDemoHubPublished = (payload: Amp_Publish_DH_Evt['payload']): void => {
  sendAmplitudeDemoHubDataEvent({
    type: AMPLITUDE_EVENTS.PUBLISH_DEMO_HUB,
    payload
  });
};

export const amplitudeDemoHubEditorOpened = (payload: Amp_Edit_DH_Evt['payload']): void => {
  sendAmplitudeDemoHubDataEvent({
    type: AMPLITUDE_EVENTS.EDIT_DEMO_HUB,
    payload
  });
};

export const amplitudeDemoHubPreviewOpened = (payload: Amp_Preview_DH_Evt['payload']): void => {
  sendAmplitudeDemoHubDataEvent({
    type: AMPLITUDE_EVENTS.PREVIEW_DEMO_HUB,
    payload
  });
};

export const amplitudeDemoHubShareModalOpened = (payload: Amp_Share_DH_Evt['payload']): void => {
  sendAmplitudeDemoHubDataEvent({
    type: AMPLITUDE_EVENTS.SHARE_DEMO_HUB,
    payload
  });
};

export const amplitudeBuyMoreQuillyCredit = (
  clickedFrom: 'header' | 'create-demo' | 'preview' | 'billing',
  creditsPurchased: number
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.QUILLY_CREDIT_PURCHASED,
    {
      clicked_from: clickedFrom,
      credits_purchased: creditsPurchased
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeRecreateDemoUsingQuilly = (
  recreateState: 'demo-recreate-clicked' | 'demo-recreate-error' |
   'demo-recreated' | 'demo-recreate-insufficient-credit'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.RECREATE_DEMO_USING_QUILLY,
    {
      recreate_state: recreateState
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export type UpgradeModalClickedFrom = 'demo_card' | 'create_journey' | 'screen_edit' |
'annotation_edit' | 'global_edit' | 'header' | 'loader_edit' | 'integrations' | 'aggregate_analytics' | 'datasets'
| 'custom_domain' | 'create_demo' | 'invite_user';
export const amplitudeUpgradeModalOpen = (
  clickedFrom: UpgradeModalClickedFrom
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.UPGRADE_MODAL_OPEN,
    {
      upgrade_modal_opned_from: clickedFrom
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeUpgradeModalCTAClicked = (
  cta:'talk_to_us' | 'upgrade'
):void => {
  traceEvent(
    AMPLITUDE_EVENTS.UPGRADE_MODAL_CTA_CLICKED,
    {
      upgrade_modal_cta: cta
    },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};
