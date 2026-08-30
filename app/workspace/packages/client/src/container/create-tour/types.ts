import { ScreenType } from '@fable/common/dist/api-contract';
import { InteractionCtx, RectWithFId, SerDoc } from '@fable/common/dist/types';
import { create_guides_marketing } from '@fable/common/dist/llm-fn-schema/create_guides_marketing';
import { create_guides_step_by_step } from '@fable/common/dist/llm-fn-schema/create_guides_step_by_step';
import { post_process_demo } from '@fable/common/dist/llm-fn-schema/post_process_demo';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { Vpd } from '../../types';

export enum DisplayState {
  ShowTourCreationOptions = 1,
  ShowNewTourOptions,
  ShowAddExistingTourOptions,
  ShowColorThemeChoices,
  ShowBorderChoices,
  ShowReview,
  ShowAddProductDescriptionOptions,
  ShowAIAddExistingTourCreditOptions,
  ShowColorPaletteOptions,
  ShowAiGenerationNotPossible
}

export interface FrameDataToBeProcessed {
  oid: number;
  frameId: number;
  tabId: number;
  type: 'serdom' | 'thumbnail' | 'sigstop';
  interactionCtx: InteractionCtxWithCandidateElpath | null;
  data: SerDoc | string;
  iconPath?: string
}

export interface ScreenInfo {
  info: {
    id: number;
    elPath: string;
    icon: string;
    type: ScreenType;
    rid: string;
    replacedWithImgScreen: boolean;
    thumbnail: string | null;
    markedImage: null | string;
  } | null
  skipped: boolean;
  vpd: Vpd | null;
}

export enum LLMScreenType {
moduleIntro= 'module_intro',
demoIntro= 'demo_intro',
demoOutro= 'demo_outro',
default='default'
}

export interface ScreenInfoWithAI extends ScreenInfo {
  aiAnnotationData: create_guides_marketing_p['items'][0] | create_guides_step_by_step_p['items'][0] | null,
  moduleData?: { name: string, description: string },
  screenType: LLMScreenType
}

export enum ModalTab {
  INIT,
  CREATE_TOUR,
  SELECT_THEME,
  SELECT_BORDER_RADIUS
}

export interface InteractionCtxDetail {
  frameRect: {
    height: number;
    width: number;
  },
  dxdy: {
    dy: number;
    dx: number;
  }
  interactionCtx: InteractionCtxWithCandidateElpath | null;
}

export interface RectWithFIdAndElpath extends RectWithFId {
  elPath: string;
}
export interface InteractionCtxWithCandidateElpath extends InteractionCtx {
  candidates: RectWithFIdAndElpath[]
}

export type AnnotationThemeType = 'global' | 'suggested' | 'page-generated';

export type ColorThemeItem = { color: string, type: AnnotationThemeType };
export type BorderRadiusThemeItem = { value: number | 'global', type: AnnotationThemeType };

export enum LLMOpsType {
  CreateDemoPerUsecase = 'create_demo_per_usecase',
  CreateDemoRouter = 'create_demo_router',
  ThemeSuggestionForGuides = 'theme_suggestion_for_guides',
  PostProcessDemo = 'post_process_demo',
  DemoMetadata='demo_metadata',
  UpdateDemoContent = 'update_demo_content',
  RootRouter = 'root_router_req'
}

export type AiData = create_guides_marketing_p | create_guides_step_by_step_p;
export type AiItem = create_guides_marketing_p['items'][0] | create_guides_step_by_step_p['items'][0]
export type AiDataMap = Map<number, AiItem>;

export type AnnotationStyle = {
  backgroundColor: string,
  fontColor: string | null,
  primaryColor: string | null,
  borderRadius: number | 'global',
  selectionColor: string | null,
  showOverlay: boolean,
  borderColor: string
}

export const LLM_IMAGE_TYPE = 'image/png';

export const LLM_MARK_COLORS: create_guides_marketing['items'][0]['element'][] = ['cyan', 'red', 'blue', 'yellow'];

export interface post_process_demo_p extends post_process_demo {
  demo_intro_guide: post_process_demo['demo_intro_guide'] & {
    text: string;
  };
  demo_outro_guide: post_process_demo['demo_outro_guide'] & {
    text: string;
  };
  modules: Array<Omit<post_process_demo['modules'][number], 'module_intro_guide'> & {
    module_intro_guide?: post_process_demo['modules'][number]['module_intro_guide'] & {
      text: string;
    }
  }>;
  updateCurrentDemoStateContent: Array<post_process_demo['updateCurrentDemoStateContent'][number] & {
    text: string;
  }>
}

export interface create_guides_marketing_p extends create_guides_marketing {
  items: Array<create_guides_marketing['items'][number] & {
    text: string
  }>
}

export interface create_guides_step_by_step_p extends create_guides_step_by_step{
  items: Array<create_guides_step_by_step['items'][number] & {
    text: string
  }>
}

export interface LLMRunData {
  ip: any;
  err: null | any;
  opMeta: any;
  messages: MessageParam[],
  systemPrompt: any;
}
