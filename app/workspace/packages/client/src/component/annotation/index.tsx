import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  AnnotationButtonStyle,
  CoverAnnotationPositions,
  IAnnotationButton,
  IAnnotationButtonType,
  IAnnotationConfig,
  ITourDataOpts,
  VideoAnnotationPositions
} from '@fable/common/dist/types';
import { sleep } from '@fable/common/dist/utils';
import React, { Suspense, lazy } from 'react';
import {
  CtaClickedInternal,
  CtaFrom
} from '../../analytics/types';
import { EventDataOnNav, FableLeadContactProps } from '../../global';
import { emitEvent } from '../../internal-events';
import { AnimEntryDir, InternalEvents, Msg, NavFn, Payload_Navigation, Payload_AnnotationPos } from '../../types';
import {
  getBorderRadiusForAnnotation,
  getTransparencyFromHexStr,
  isAudioAnnotation,
  isCoverAnnotation as isCoverAnn,
  isEventValid,
  isVideoAnnotation,
} from '../../utils';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import { getAnnotationBtn } from './ops';
import { ApplyDiffAndGoToAnn, NavToAnnByRefIdFn } from '../screen-editor/types';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import AnnotationWatermark, { WatermarkText } from '../watermark/annotation-watermark';
import { WatermarkCon } from '../watermark/styled';
import { IAnnotationConfigWithScreenId, isAnnCustomPosition } from './annotation-config-utils';
import FocusBubble from './focus-bubble';
import * as VIDEO_ANN from './media-ann-constants';
import * as Tags from './styled';
import { EMPTY_IFRAME_ID, generateShadeColor, isLeadFormPresent, validateInput } from './utils';

const AnnotationMedia = lazy(() => import('./media-player'));
interface NavigateToAnnMessage<T> extends MessageEvent{
  data: Msg<T>
}
interface IProps {
  el: HTMLElement;
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  win: Window,
  playMode: boolean,
  tourId: number;
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isThemeAnnotation?: boolean;
  maskBox: Rect | null;
  isScreenHTML4: boolean;
  screenId: number
}

export type NavigateToAdjacentAnn = (direction: 'prev' | 'next' | 'custom', btnId: string) => void;

export class AnnotationContent extends React.PureComponent<{
  config: IAnnotationConfig;
  opts: ITourDataOpts;
  isInDisplay: boolean;
  width: number;
  top: number,
  left: number,
  onRender?: (el: HTMLDivElement) => void,
  tourId: number,
  dir: AnimEntryDir
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isThemeAnnotation?: boolean,
  doc?: Document,
  isProbing?: boolean,
  isMediaAnn: boolean,
}> {
  static readonly WIDTH_MOBILE = 240;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private readonly contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount(): void {
    if (this.props.onRender) {
      if (this.contentRef.current) {
        const annTextP = this.contentRef.current.querySelector('p') || this.contentRef.current;
        const defaultFontFamily = this.props.opts.annotationFontFamily?._val || getComputedStyle(annTextP)!.fontFamily;

        let fontLoadingPromise: Promise<unknown> = Promise.resolve();
        if (defaultFontFamily && this.props.doc) {
          let timer = 0;
          fontLoadingPromise = Promise.race([
            sleep(300),
            new Promise((res) => {
              timer = setInterval(() => {
                const result = this.props.doc?.fonts.check(`1rem ${defaultFontFamily}`);
                if (result) res(1);
              }, 16) as unknown as number;
            })
          ]);
          fontLoadingPromise.then(() => {
            if (timer) clearInterval(timer);
          });
        }

        const els: Array<HTMLImageElement | HTMLLinkElement> = Array
          .from(this.contentRef.current?.getElementsByTagName('img'));

        Promise.all(els.map(img => new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          img.onabort = resolve;
        })).concat(fontLoadingPromise)).then(() => {
          requestAnimationFrame(() => this.props.onRender!(this.conRef.current!));
        });
      } else {
        this.props.onRender(this.conRef.current!);
      }
    }
  }

  getAnnotationBorder(hasOverlay: boolean): string {
    const borderColor = this.props.opts.annotationBodyBorderColor._val;
    return `0px 0px 0px 1px ${borderColor}, rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px`;
  }

  componentWillUnmount(): void {
    this.conRef.current && (this.conRef.current.style.visibility = 'hidden');
  }

  render(): JSX.Element {
    const allBtns = this.props.config.buttons.filter(c => !c.exclude);
    let backBtn: IAnnotationButton | null = null;
    const btns: IAnnotationButton[] = [];

    for (const btn of allBtns) {
      if (btn.type === 'prev') backBtn = btn;
      else btns.push(btn);
    }

    const padding: number[] = this.props.opts.annotationPadding._val.split(/\s+/).map(v => (Number.isFinite(+v) ? +v : 14));
    if (padding.length === 1) padding.push(padding[0]);
    if (padding.length === 0) padding.push(14, 14);
    return (
      <Tags.AnContent
        key={this.props.config.refId}
        ref={this.conRef}
        primaryColor={this.props.opts.primaryColor._val}
        fontColor={this.props.opts.annotationFontColor._val}
        borderRadius={this.props.opts.borderRadius._val}
        padding={padding as [number, number]}
        bgColor={this.props.opts.annotationBodyBackgroundColor._val}
        style={{
          flexDirection: 'column',
          minWidth: `${this.props.config.size === 'custom' ? 0 : AnnotationContent.WIDTH_MOBILE}px`,
          width: `${this.props.width}px`,
          display: this.props.isInDisplay ? 'flex' : 'none',
          visibility: 'visible',
          left: this.props.left,
          top: this.props.top,
          fontSize: '18px',
          boxShadow: this.getAnnotationBorder(this.props.config.showOverlay),
          borderRadius: this.props.opts.borderRadius._val,
          position: this.props.isThemeAnnotation ? 'unset' : 'absolute',
        }}
        id={this.props.isProbing ? '' : 'fable-ann-card-rendered'}
        className={`fable-ann-card f-a-c-${this.props.config.refId} dir-${this.props.dir}`}
      >
        <Tags.AnInnerContainer className="f-inner-con">
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          {
            this.props.config.isLeadFormPresent ? (
              <form target={EMPTY_IFRAME_ID} action="about:blank">
                <Tags.AnTextContent
                  fontFamily={this.props.opts.annotationFontFamily._val}
                  fontColor={this.props.opts.annotationFontColor._val}
                  ref={this.contentRef}
                  borderRadius={this.props.opts.borderRadius._val}
                  dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
                  className="f-text"
                />
              </form>
            ) : (
              <Tags.AnTextContent
                fontFamily={this.props.opts.annotationFontFamily._val}
                fontColor={this.props.opts.annotationFontColor._val}
                ref={this.contentRef}
                borderRadius={this.props.opts.borderRadius._val}
                dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
                className="f-text"
              />
            )
          }
          {allBtns.length > 0 && (
            <Tags.ButtonCon
              justifyContent={backBtn && allBtns.length > 1 ? 'space-between' : 'center'}
              borderTopColor={generateShadeColor(this.props.opts.annotationBodyBackgroundColor._val)}
              btnLength={allBtns.length}
              flexDirection="row"
              anPadding={this.props.opts.annotationPadding._val.trim()}
              className="f-button-con"
            >
              {backBtn && (
                <Tags.ABtn
                  bg={this.props.opts.annotationBodyBackgroundColor._val}
                  className={`f-${generateCSSSelectorFromText(backBtn.text._val)}-btn f-ann-btn`}
                  idx={-1}
                  key={backBtn.id}
                  noPad
                  btnStyle={AnnotationButtonStyle.Link}
                  color={this.props.opts.primaryColor._val}
                  size={backBtn.size._val}
                  fontFamily={this.props.opts.annotationFontFamily._val}
                  btnLayout="default"
                  borderRadius={this.props.opts.borderRadius._val}
                  onClick={() => {
                    this.props.navigateToAdjacentAnn(backBtn!.type, backBtn!.id);
                  }}
                >
                  <ArrowLeftOutlined
                    style={{
                      fontSize: '1.5rem',
                      color: this.props.opts.primaryColor._val
                    }}
                  />
                </Tags.ABtn>
              )}

              <div
                className="f-button-con-2"
                style={{
                  display: 'flex',
                  flexDirection: this.props.config.buttonLayout === 'default' ? 'row' : 'column',
                  gap: '0.5rem',
                  justifyContent: backBtn ? 'flex-end' : 'center',
                  flex: '1 1 auto',
                  flexWrap: 'wrap'
                }}
              >
                {btns.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                  <Tags.ABtn
                    bg={this.props.opts.annotationBodyBackgroundColor._val}
                    className={`f-${generateCSSSelectorFromText(btnConf.text._val)}-btn f-ann-btn`}
                    idx={idx}
                    key={btnConf.id}
                    btnStyle={btnConf.style._val}
                    color={this.props.opts.primaryColor._val}
                    size={btnConf.size._val}
                    fontFamily={this.props.opts.annotationFontFamily._val}
                    btnLayout={this.props.config.buttonLayout}
                    borderRadius={this.props.opts.borderRadius._val}
                    onClick={() => {
                      if (this.conRef.current && isLeadFormPresent(this.conRef.current) && btnConf.type === 'next') {
                        const leadFormFields = this.conRef.current?.getElementsByClassName('LeadForm__optionContainer');

                        let shouldNavigate = true;
                        const leadForm: Record<string, string | undefined> = {};
                        if (leadFormFields) {
                          for (const field of Array.from(leadFormFields)) {
                            const { isValid, fieldName, fieldValue } = validateInput(field as HTMLDivElement);
                            if (!isValid) shouldNavigate = false;
                            leadForm[fieldName] = fieldValue;
                          }
                        }

                        const pk_val = leadForm[this.props.opts.lf_pkf] || '';
                        if (shouldNavigate) {
                          const evt: FableLeadContactProps = {
                            ...leadForm,
                            pk_key: this.props.opts.lf_pkf,
                            pk_val,
                          };
                          emitEvent<Partial<FableLeadContactProps>>(InternalEvents.LeadAssign, evt);
                          Promise.resolve().then(() => this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id));
                        }
                        return;
                      }
                      Promise.resolve().then(() => this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id));
                    }}
                  >
                    <span>{
                    btnConf.type === 'prev' && this.props.config.buttonLayout === 'default' ? (
                      <ArrowLeftOutlined
                        style={{
                          fontSize: '1.5rem',
                          color: this.props.opts.primaryColor._val
                        }}
                        className="f-back-btn-icon"
                      />) : btnConf.text._val
                    }
                    </span>
                  </Tags.ABtn>
                ))}
              </div>

            </Tags.ButtonCon>
          )}
        </Tags.AnInnerContainer>

        {/* Watermark */}
        {this.props.opts.showFableWatermark._val
        && !this.props.isMediaAnn
        && (
          <WatermarkCon
            style={{
              color: this.props.opts.annotationFontColor._val,
            }}
            target="_blank"
            rel="noopener noreferrer"
            href="https://sharefable.com"
          >
            <WatermarkText />
          </WatermarkCon>
        )}

      </Tags.AnContent>
    );
  }
}

export class AnnotationCard extends React.PureComponent<IProps> {
  static readonly BREATHING_SPACE_RATIO = 30;

  static readonly ANNOTAITON_EL_MARGIN = 20;

  static readonly MIN_SPACE = 4;

  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private transitionTimer : number | NodeJS.Timeout = 0;

  private SELECTION_BUBBLE_DIAMETER = 18;

  private SELECTION_BUBBLE_MARGIN = 8;

  private isInitialTransitionDone = false;

  getAnnotationType(): EventDataOnNav['annotationType'] {
    /*
    For annotations with voiceover, the display type can either be voiceover or text,
    depending on the Interactive mode. When the mode is set to "Interactive Demo,"
    the annotation type will be text. In this case, this.props.annotationDisplayConfig.isMediaAnnotation
    is set to false, and therefore, the annotation type is sent as text.
    */
    if (this.props.annotationDisplayConfig.config.voiceover) {
      if (this.props.annotationDisplayConfig.isMediaAnnotation) return 'voiceover';
      return 'text';
    }
    if (isVideoAnnotation(this.props.annotationDisplayConfig.config)) return 'video';
    if (isAudioAnnotation(this.props.annotationDisplayConfig.config)) return 'audio';
    if (this.props.annotationDisplayConfig.config.isLeadFormPresent) return 'leadform';
    return 'text';
  }

  componentDidMount(): void {
    if (this.props.annotationDisplayConfig.isMaximized) {
      this.props.win.addEventListener('message', this.receiveMessage, false);
    }

    if (this.conRef.current) { this.resetAnnPos(); }
    if (this.props.annotationDisplayConfig.isMaximized) {
      emitEvent<Partial<Payload_Navigation>>(InternalEvents.OnNavigation, {
        currentAnnotationRefId: this.props.annotationDisplayConfig.config.refId,
        annotationType: this.getAnnotationType(),
        box: this.props.box,
        screenId: this.props.screenId,
        annConfigType: this.props.annotationDisplayConfig.config.type
      });
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<{}>, snapshot?: any): void {
    if (prevProps.annotationDisplayConfig.isMaximized !== this.props.annotationDisplayConfig.isMaximized
       && this.props.annotationDisplayConfig.isMaximized) {
      emitEvent<Partial<Payload_Navigation>>(InternalEvents.OnNavigation, {
        currentAnnotationRefId: this.props.annotationDisplayConfig.config.refId,
        annotationType: this.getAnnotationType(),
        box: this.props.box,
        screenId: this.props.screenId,
        annConfigType: this.props.annotationDisplayConfig.config.type
      });
      if (this.conRef.current && this.props.annotationDisplayConfig.isMediaAnnotation) {
        this.resetAnnPos();
      }
    }

    if (prevProps.annotationDisplayConfig.isMaximized !== this.props.annotationDisplayConfig.isMaximized) {
      if (this.props.annotationDisplayConfig.isMaximized) {
        this.props.win.addEventListener('message', this.receiveMessage, false);
      } else {
        this.props.win.removeEventListener('message', this.receiveMessage, false);
      }
    }
  }

  componentWillUnmount(): void {
    this.props.win.removeEventListener('message', this.receiveMessage, false);
    clearTimeout(this.transitionTimer);
    this.transitionTimer = 0;
  }

  /**
   * The way keyboard event works is a little complex although it seems like it could have been done easily.
   *
   * Preface knowledge:
   * Fable records multiple screen with annotation during the recording phase. While the demo is played, we try to apply
   * diff on top of the same screen; provided if both the screens are from same domain. Which means, same document
   * object is shared among multiple steps (annotations). In this mix, there might be a screen of completely different
   * domain (or an image scren) might be present that might have a different document object.
   *
   * Solution:
   * Intuitively, it feels like a keyboard listener towards the top of the page can handle the
   * navigation just like we handle similar navigation on mouse click. This could have been possible if the navigation
   * control was as upstream (on the root iframe) as possible in the application (in the hindsight that might have been
   * a correct design decision). But for our case, navigation control happens on the most downstream component that is
   * there (AnnotationCard) hence we need to control listeners firing the event. On top of which prerendering needs to
   * be considered as well.
   *
   * At first, in preview ifrmae (preview.tsx) we raise internal event based on the keyboard event. The prerendering
   * considerations are done at that very phase itself simplifying the downstream code. An internal event is raised return
   * based on the dom event, we capture the event here and decide what needs to be done on keyboard next or back button press.
   * An annotation might be in maximized mode / minimized mode. The event listener is attached or remove based on that.
   */
  // receiveMessage = (e: NavigateToAnnMessage<Payload_NavToAnnotation>): void => {
  receiveMessage = (e: any): void => {
    if (!isEventValid(e)) return;
    // If lead form is present then we don't enable keyboard navigation as it'll create issue with leadform input and
    // verification process
    if (this.props.annotationDisplayConfig.config.isLeadFormPresent) return;
    // Ref: https://sharefable.slack.com/archives/C0491PEEPPZ/p1725969199365899?thread_ts=1725955461.355159&cid=C0491PEEPPZ
    if (!this.props.annotationDisplayConfig.isMaximized) return;
    if (e.data.type === 'f-go-next-ann') {
      const nextBtn = this.props.annotationDisplayConfig.config.buttons.filter(btn => btn.type === 'next');
      this.props.navigateToAdjacentAnn('next', nextBtn[0].id);
    } else if (e.data.type === 'f-go-prev-ann') {
      const prevBtn = this.props.annotationDisplayConfig.config.buttons.filter(btn => btn.type === 'prev');
      this.props.navigateToAdjacentAnn('prev', prevBtn[0].id);
    } else if (e.data.type === 'f-custom-btn' && e.data.btnId) {
      this.props.navigateToAdjacentAnn('custom', e.data.btnId);
    }
  };

  resetAnnPos = (): void => {
    this.transitionTimer = setTimeout(() => {
      this.conRef.current!.style.transition = 'transform 0.3s ease-out';
      this.conRef.current!.style.transform = 'translate(0px, 0px)';
    }, 48);
    this.isInitialTransitionDone = true;
  };

  getAnnWidthHeight = ():{
    w: number,
    h: number,
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const config = displayConfig.config;
    const isMediaAnnotation = displayConfig.isMediaAnnotation;
    const isCoverAnnotation = isCoverAnn(config);

    const boxSize = this.props.annotationDisplayConfig.config.size;

    let w = 0;
    let h = 0;

    if (boxSize === 'small') {
      w = this.props.annotationDisplayConfig.dimForSmallAnnotation.w;
      h = this.props.annotationDisplayConfig.dimForSmallAnnotation.h;
    }

    if (boxSize === 'medium') {
      if (isMediaAnnotation) {
        if (isCoverAnnotation) {
          switch (this.props.annotationDisplayConfig.config.positioning) {
            case VideoAnnotationPositions.BottomLeft:
            case VideoAnnotationPositions.BottomRight:
              w = VIDEO_ANN.COVER_MED_WIDTH;
              h = VIDEO_ANN.COVER_MED_HEIGHT;
              break;
            case VideoAnnotationPositions.Center:
            case VideoAnnotationPositions.Follow:
            default:
              w = VIDEO_ANN.COVER_MED_WIDTH_CENTER;
              h = VIDEO_ANN.COVER_MED_HEIGHT_CENTER;
              break;
          }
        }

        if (!isCoverAnnotation) {
          w = VIDEO_ANN.DEFAULT_MED_WIDTH;
          h = VIDEO_ANN.DEFAULT_MED_HEIGHT;
        }
      }

      if (!isMediaAnnotation) {
        w = this.props.annotationDisplayConfig.dimForMediumAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForMediumAnnotation.h;
      }
    }

    if (boxSize === 'large') {
      if (isMediaAnnotation) {
        if (isCoverAnnotation) {
          switch (this.props.annotationDisplayConfig.config.positioning) {
            case VideoAnnotationPositions.BottomLeft:
            case VideoAnnotationPositions.BottomRight:
              w = VIDEO_ANN.COVER_LARGE_WIDTH;
              h = VIDEO_ANN.COVER_LARGE_HEIGHT;
              break;
            case VideoAnnotationPositions.Center:
            case VideoAnnotationPositions.Follow:
            default:
              w = VIDEO_ANN.COVER_LARGE_WIDTH_CENTER;
              h = VIDEO_ANN.COVER_LARGE_HEIGHT_CENTER;
              break;
          }
        }

        if (!isCoverAnnotation) {
          w = VIDEO_ANN.DEFAULT_LARGE_WIDTH;
          h = VIDEO_ANN.DEFAULT_LARGE_HEIGHT;
        }
      }

      if (!isMediaAnnotation) {
        w = this.props.annotationDisplayConfig.dimForLargeAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForLargeAnnotation.h;
      }
    }

    if (boxSize === 'custom') {
      w = this.props.annotationDisplayConfig.dimForCustomAnnotation.w;
      h = this.props.annotationDisplayConfig.dimForCustomAnnotation.h;
      if (isMediaAnnotation) {
        h = VIDEO_ANN.getHeightForConstWidth(w);
      }
    }
    return {
      w, h
    };
  };

  getAutoDefaultAndVideoAnnRenderingData = (w: number, h: number,): {
    l: number,
    t: number,
    dir: AnimEntryDir,
    isUltrawideBox: boolean
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const elBox = this.props.box;
    const winW = displayConfig.windowWidth;
    const winH = displayConfig.windowHeight;
    const isMediaAnnotation = displayConfig.isMediaAnnotation;

    let l = -9999;
    let t = -9999;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox = false;

    if (!displayConfig.isInViewPort) return { l, t, dir, isUltrawideBox };
    if (isMediaAnnotation && displayConfig.config.positioning === 'center') {
      t = winH / 2 - h / 2;
      l = winW / 2 - w / 2;
      return { l, t, dir, isUltrawideBox };
    }

    if (isMediaAnnotation && displayConfig.config.positioning === VideoAnnotationPositions.BottomLeft) {
      t = winH - h - 20;
      l = 20;
      return { l, t, dir, isUltrawideBox };
    }

    if (isMediaAnnotation && displayConfig.config.positioning === VideoAnnotationPositions.BottomRight) {
      t = winH - h - 20;
      l = winW - w - 20;

      if (displayConfig.opts.showFableWatermark._val) {
        l -= 72;
      }
      return { l, t, dir, isUltrawideBox };
    }

    const extraSpace = displayConfig.opts.borderRadius._val;

    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const LEFT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.left;
    const RIGHT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.right;
    const TOP_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.top;
    const BOTTOM_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.bottom;

    if (this.isElBoxOutOfViewport(elBox)) {
      isUltrawideBox = true;
      l = this.props.win.innerWidth - w - LEFT_ANN_EL_MARGIN;
      t = this.props.win.innerHeight - h - TOP_ANN_EL_MARGIN;
      return {
        l, t, dir, isUltrawideBox
      };
    }

    const leftSpace = elBox.left;
    const rightSpace = winW - elBox.right;
    const ml = leftSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
    const mr = rightSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
    let p: 'l' | 'r' | 't' | 'b' | undefined;
    let isHorDir = false;
    if (ml > 1 || mr > 1) {
      p = ml > mr ? 'l' : 'r';
      isHorDir = true;
    }
    if (isHorDir) {
      t = elBox.top + elBox.height / 2 - (h / 2);

      if (t <= TOP_ANN_EL_MARGIN) {
        // If the top of the annotation is outside the viewport
        t = Math.max(elBox.top - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.top);
      }
      if (t + h + TOP_ANN_EL_MARGIN >= winH) {
        // If the bottom of the annotation is outside the viewport
        t = Math.min(elBox.bottom - h + HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.bottom - h);
      }

      if (t - extraSpace <= AnnotationCard.MIN_SPACE || t + h + extraSpace >= winH) {
        isHorDir = false;
      }

      if (p === 'l') {
        l = elBox.left - w - LEFT_ANN_EL_MARGIN;
      } else {
        l = elBox.right + RIGHT_ANN_EL_MARGIN;
      }
    }

    if (!isHorDir) {
      const topSpace = elBox.top;
      const bottomSpace = winH - elBox.bottom;
      const mt = topSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
      const mb = bottomSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
      if (mb > 1 || mt > 1) {
        p = mb > mt ? 'b' : 't';
      }
      if (p === 't' || p === 'b') {
        l = elBox.left + elBox.width / 2 - (w / 2);

        if (l + w > winW) {
          l = winW - w - extraSpace;
        } else if (l < 0) {
          l = extraSpace;
        }

        if (p === 't') {
          t = elBox.top - h - TOP_ANN_EL_MARGIN;
        } else {
          t = elBox.bottom + BOTTOM_ANN_EL_MARGIN;
        }
      }
    }

    if (!p) {
      isUltrawideBox = true;
      l = elBox.right - w - LEFT_ANN_EL_MARGIN;
      t = elBox.bottom - h - TOP_ANN_EL_MARGIN;
    } else {
      dir = p || 't';
    }

    return {
      l, t, dir, isUltrawideBox
    };
  };

  isElBoxOutOfViewport(elBox: Rect): boolean {
    if (elBox.left + elBox.width > this.props.win.innerWidth) return true;
    if (elBox.top + elBox.height > this.props.win.innerHeight) return true;
    return false;
  }

  getCoverAnnRenderingData = (w: number, h: number,): {
    l: number,
    t: number,
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const winW = displayConfig.windowWidth;
    const winH = displayConfig.windowHeight;
    const pos = displayConfig.config.positioning;

    let l = winW / 2 - w / 2;
    const t = winH / 2 - h / 2;

    if (pos === CoverAnnotationPositions.LEFT) {
      l = winW / 4 - w / 2;
    }
    if (pos === CoverAnnotationPositions.RIGHT) {
      l = winW / 2 + winW / 4 - w / 2;
    }

    return { l, t };
  };

  adjustTopLeftOfAnn = (
    l: number,
    t: number,
    w: number,
    h: number,
    dir: AnimEntryDir,
  ): { l: number, t: number } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const elBox = this.props.box;

    const annBox = {
      top: t,
      left: l,
      width: w,
      height: h,
    };

    const borderRadius = displayConfig.opts.borderRadius._val;
    const arrowWidth = 30;
    const arrowHeight = arrowWidth;

    if (dir === 'l' || dir === 'r') {
      let arrowTop = elBox.top + elBox.height / 2 - arrowWidth / 2;
      if (arrowTop + arrowHeight > annBox.top + annBox.height - borderRadius) {
        const diff = (arrowTop + arrowHeight) - (annBox.top + annBox.height);
        arrowTop -= diff;
      } else if (arrowTop < annBox.top + borderRadius) {
        const diff = annBox.top - arrowTop;
        arrowTop += diff;
      }
      if (elBox.height < annBox.height) {
        if (arrowTop < t + borderRadius) {
          t -= borderRadius;
        } else if (arrowTop + arrowWidth > t + h - borderRadius) {
          t += borderRadius;
        }
      }
    }

    if (dir === 't' || dir === 'b') {
      let arrowLeft = elBox.left + elBox.width / 2 - arrowWidth / 2;
      if (arrowLeft + arrowWidth >= annBox.left + annBox.width - borderRadius) {
        const diff = (arrowLeft + arrowWidth) - (annBox.left + annBox.width);
        arrowLeft -= diff;
      } else if (arrowLeft < annBox.left + borderRadius) {
        const diff = annBox.left - arrowLeft;
        arrowLeft += diff;
      }
      if (elBox.width < annBox.width) {
        if (arrowLeft <= l + borderRadius) {
          l -= borderRadius;
        } else if (arrowLeft + arrowWidth >= l + w - borderRadius) {
          l += borderRadius;
        }
      }
    }

    return { t, l };
  };

  getCustomDefaultAndVideoAnnPosDir = (): AnimEntryDir => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const side = pos.split('-')[1];

    let dir: AnimEntryDir = 't';

    if (side === 'top') { dir = 't'; }
    if (side === 'right') { dir = 'r'; }
    if (side === 'bottom') { dir = 'b'; }
    if (side === 'left') { dir = 'l'; }

    return dir;
  };

  /** *
   *  If custom position is c-top-left
   *  top -> position
   *  left -> subposition
   */
  getCustomDefaultAndVideoAnnPosLeft = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomDefaultAndVideoAnnPosDir();
    const elBox = this.props.box;
    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const LEFT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.left;
    const RIGHT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.right;

    if (dir === 'l') { return elBox.left - w - LEFT_ANN_EL_MARGIN; }
    if (dir === 'r') { return elBox.right + RIGHT_ANN_EL_MARGIN; }

    const subPosition = pos.split('-').at(-1);
    if (subPosition === 'left') { return elBox.left - maskBoxPadding.left; }
    if (subPosition === 'right') { return elBox.right - w + maskBoxPadding.right; }
    if (subPosition === 'center') { return (elBox.left + elBox.width / 2) - (w / 2); }

    return 0;
  };

  getCustomDefaultAndVideoAnnPosTop = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomDefaultAndVideoAnnPosDir();
    const elBox = this.props.box;

    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const TOP_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.top;
    const BOTTOM_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.bottom;

    if (dir === 't') { return elBox.top - h - TOP_ANN_EL_MARGIN; }
    if (dir === 'b') { return elBox.bottom + BOTTOM_ANN_EL_MARGIN; }

    const subPosition = pos.split('-').at(-1);
    if (subPosition === 'top') { return elBox.top - maskBoxPadding.top; }
    if (subPosition === 'bottom') { return elBox.bottom - h + maskBoxPadding.bottom; }
    if (subPosition === 'center') { return (elBox.top + elBox.height / 2) - (h / 2); }

    return 0;
  };

  isAnnOutSideOfViewPort = (
    l: number,
    t: number,
    w: number,
    h: number,
    minSpace = AnnotationCard.MIN_SPACE
  ): boolean => {
    const winW = this.props.annotationDisplayConfig.windowWidth;
    const winH = this.props.annotationDisplayConfig.windowHeight;

    if (l < minSpace) return true;
    if (t < minSpace) return true;
    if (l + w > winW) return true;
    if (t + h > winH) return true;

    return false;
  };

  shouldShowArrowHead = (): boolean => {
    const config = this.props.annotationDisplayConfig.config;
    const pos = config.positioning;
    const isMediaAnnotation = this.props.annotationDisplayConfig.isMediaAnnotation;
    const isCoverAnnotation = isCoverAnn(config);

    if (isCoverAnnotation) return false;

    if (isMediaAnnotation) {
      return false;
    }

    return true;
  };

  getFocusBubbleStyles = (maskBoxRect: Rect, dir: AnimEntryDir) : React.CSSProperties => {
    const {
      top: maskBoxTop,
      left: maskBoxLeft,
      width: maskBoxWidth,
      height: maskBoxHeight
    } = maskBoxRect;

    const annPos = dir;
    const styles: Record<string, string> = {};

    if (annPos === 'l' || annPos === 'r') {
      if (annPos === 'l') {
        styles.left = `${maskBoxLeft - this.SELECTION_BUBBLE_DIAMETER / 2 + this.SELECTION_BUBBLE_MARGIN}px`;
      } else {
        styles.left = `${
          maskBoxLeft + maskBoxWidth - this.SELECTION_BUBBLE_DIAMETER / 2 - this.SELECTION_BUBBLE_MARGIN}px`;
      }
      styles.top = `${maskBoxTop + maskBoxHeight / 2 - this.SELECTION_BUBBLE_DIAMETER / 2}px`;
    } else {
      if (annPos === 't') {
        styles.top = `${maskBoxTop - this.SELECTION_BUBBLE_DIAMETER / 2 + this.SELECTION_BUBBLE_MARGIN}px`;
      } else {
        styles.top = `${
          maskBoxTop + maskBoxHeight - this.SELECTION_BUBBLE_DIAMETER / 2 - this.SELECTION_BUBBLE_MARGIN}px`;
      }
      styles.left = `${maskBoxLeft + maskBoxWidth / 2 - this.SELECTION_BUBBLE_DIAMETER / 2}px`;
    }

    return styles;
  };

  // TODO[refactor]
  //  Multiple branching besed render happens leading to similar configuration of same component. Make a single render
  //  by calculating the variables / configs via branching and applying those variables / config on the singular
  //  rendered component
  render(): JSX.Element {
    const { w, h } = this.getAnnWidthHeight();
    const displayConfig = this.props.annotationDisplayConfig;

    const config = displayConfig.config;
    const isMediaAnnotation = displayConfig.isMediaAnnotation;
    const isCoverAnnotation = isCoverAnn(config);

    let t: number = 0;
    let l: number = 0;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox: boolean = false;
    let isAnnRenderedInScreenCorner = false;

    const annType = isMediaAnnotation ? 'media' : config.type;

    if (annType === 'default' || annType === 'media') {
      let showAutoPositioning = !isAnnCustomPosition(this.props.annotationDisplayConfig.config.positioning);

      if (!showAutoPositioning) {
        l = this.getCustomDefaultAndVideoAnnPosLeft(w, h);
        t = this.getCustomDefaultAndVideoAnnPosTop(w, h);
        dir = this.getCustomDefaultAndVideoAnnPosDir();

        const adjustedPos = this.adjustTopLeftOfAnn(l, t, w, h, dir);
        l = adjustedPos.l;
        t = adjustedPos.t;

        const annOutsideOfViewport = this.isAnnOutSideOfViewPort(l, t, w, h);

        if (annOutsideOfViewport) { showAutoPositioning = true; }
      }

      if (showAutoPositioning) {
        const renderingData = this.getAutoDefaultAndVideoAnnRenderingData(w, h);
        t = renderingData.t;
        l = renderingData.l;
        dir = renderingData.dir;
        isUltrawideBox = renderingData.isUltrawideBox;

        if (!isUltrawideBox) {
          const adjustedPos = this.adjustTopLeftOfAnn(l, t, w, h, dir);
          l = adjustedPos.l;
          t = adjustedPos.t;
        }

        const annOutsideOfViewport = this.isAnnOutSideOfViewPort(l, t, w, h, 0);
        if (annOutsideOfViewport) {
          const win = this.props.win;
          l = win.innerWidth - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE - w;
          t = win.innerHeight - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE - h;
          isAnnRenderedInScreenCorner = true;
        }
      }
    }

    if (annType === 'cover') {
      const renderingData = this.getCoverAnnRenderingData(w, h);
      t = renderingData.t;
      l = renderingData.l;
    }

    const [cdx, cdy] = HighlighterBase.getCumulativeDxDy(this.props.win);
    const maskBoxRect = HighlighterBase.getMaskBoxRect(this.props.box, this.props.win, cdx, cdy, this.props.isScreenHTML4);
    let arrowStroke = this.props.annotationDisplayConfig.opts.annotationBodyBorderColor._val;
    const arrowFill = this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor._val;
    let isBorderColorDefault = false;
    if (arrowStroke.toUpperCase() === '#BDBDBD' || getTransparencyFromHexStr(arrowStroke) <= 30) {
      arrowStroke = this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor._val;
      isBorderColorDefault = true;
    }

    const d = 30;
    let tx = 0;
    let ty = 0;

    if (!isCoverAnnotation && !(
      this.props.annotationDisplayConfig.config.positioning === VideoAnnotationPositions.BottomLeft
      || this.props.annotationDisplayConfig.config.positioning === VideoAnnotationPositions.BottomRight)) {
      if (dir === 'l') {
        tx -= d;
      } else if (dir === 'r') {
        tx += d;
      } else if (dir === 't') {
        ty -= d;
      } else if (dir === 'b') {
        ty += d;
      }
    } else {
      ty -= d;
    }

    let bodyScrollTopAdjustment = 0;
    let bodyScrollLeftAdjustment = 0;

    // we need ((this.props.playMode && !isMediaAnnotation) || !this.props.playMode) condition because in
    // screen editor we need to consider body scroll for media annotation but not in player as
    // media annotation in player is placed outside iframe
    if (!isCoverAnnotation && ((this.props.playMode && !isMediaAnnotation) || !this.props.playMode)) {
      const body = this.props.win.document.body;

      if (!this.props.isScreenHTML4) {
        bodyScrollTopAdjustment = body.scrollTop;
        bodyScrollLeftAdjustment = body.scrollLeft;
      }

      t += this.props.win.scrollY + bodyScrollTopAdjustment;
      l += this.props.win.scrollX + bodyScrollLeftAdjustment;
    }

    if (this.isInitialTransitionDone) {
      tx = 0;
      ty = 0;
    }

    if (this.props.annotationDisplayConfig.isMaximized && isMediaAnnotation) {
      emitEvent<Payload_AnnotationPos>(InternalEvents.OnSelectedElChange, {
        currentAnnotationRefId: this.props.annotationDisplayConfig.config.refId,
        annotationType: this.props.annotationDisplayConfig.config.type,
        top: t,
        left: l,
        dir,
        width: w,
        height: h
      });
    }
    return (
      <>
        { !this.props.annotationDisplayConfig.config.hideAnnotation && (
          <Tags.AnnotationCardCon
            ref={this.conRef}
            style={{
              transform: this.props.isThemeAnnotation
                ? 'none' : `translate(${tx}px, ${ty}px)`,
            }}
          >
            {/* this is arrow head */}
            {
            this.shouldShowArrowHead() && !isAnnRenderedInScreenCorner && !isUltrawideBox && (
              <AnnotationIndicator
                box={{
                  ...this.props.box,
                  top: this.props.box.top + this.props.win.scrollY + bodyScrollTopAdjustment,
                  left: this.props.box.left + this.props.win.scrollX + bodyScrollLeftAdjustment,
                }}
                pos={dir}
                maskBoxRect={maskBoxRect}
                arrowStroke={arrowStroke}
                arrowFill={arrowFill}
                annBox={{
                  top: t,
                  left: l,
                  width: w,
                  height: h
                }}
                isBorderColorDefault={isBorderColorDefault}
                annBorderRadius={this.props.annotationDisplayConfig.opts.borderRadius._val}
              />
            )
          }
            {/* this is video annotation */}
            <Suspense fallback={null}>
              {
                isMediaAnnotation && !this.props.playMode && (
                <AnnotationMedia
                  borderRadius={getBorderRadiusForAnnotation(
                    this.props.annotationDisplayConfig.config.positioning,
                    isCoverAnnotation,
                    this.props.annotationDisplayConfig.opts.showFableWatermark._val,
                    dir,
                    this.props.annotationDisplayConfig.opts.borderRadius._val
                  )}
                  conf={this.props.annotationDisplayConfig.config}
                  playMode={this.props.playMode}
                  annFollowPositions={{
                    top: t,
                    left: l,
                    dir
                  }}
                  width={w}
                  height={h}
                  tourId={this.props.tourId}
                  annScale={1}
                  nav={(adir: any) => {}}
                  opts={this.props.annotationDisplayConfig.opts}
                  confRefId={this.props.annotationDisplayConfig.config.refId}
                  type={isVideoAnnotation(this.props.annotationDisplayConfig.config) ? 'video' : 'audio'}
                  doNotAutoplayMedia={[]}
                />
                )
              }
            </Suspense>
            {/* this is normal annotation content */}
            {
            !isMediaAnnotation && (
              <AnnotationContent
                config={this.props.annotationDisplayConfig.config}
                opts={this.props.annotationDisplayConfig.opts}
                isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
                width={w}
                top={t}
                left={l}
                tourId={this.props.tourId}
                dir={dir}
                navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
                isMediaAnn={this.props.annotationDisplayConfig.isMediaAnnotation}
              />
            )
          }

            {this.props.annotationDisplayConfig.opts.showFableWatermark._val
            && isMediaAnnotation
            && !(config.voiceover && this.props.playMode)
            && (
              <AnnotationWatermark
                borderRadius={this.props.annotationDisplayConfig.opts.borderRadius._val}
                isMediaAnn={isMediaAnnotation}
                bgColor={this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor._val}
                fontColor={this.props.annotationDisplayConfig.opts.annotationFontColor._val}
                top={t + (this.props.playMode ? this.props.win.scrollY + bodyScrollTopAdjustment : 0)}
                left={l + (this.props.playMode ? this.props.win.scrollX + bodyScrollLeftAdjustment : 0)}
                height={h}
                width={w}
                arrowDir={dir}
                isCoverAnn={isCoverAnn(config)}
                positioning={this.props.annotationDisplayConfig.config.positioning}
              />
            )}
          </Tags.AnnotationCardCon>
        )}

        {/* this is focus bubble */}
        {
          config.selectionShape._val === 'pulse' && !isCoverAnn(config) && (
          <div
            onClick={() => {
              const btnConf = config.buttons.filter(button => button.type === 'next')[0];
              this.props.navigateToAdjacentAnn('next', btnConf.id);
            }}
          >
            <FocusBubble
              diameter={this.SELECTION_BUBBLE_DIAMETER}
              style={{
                position: 'absolute',
                ...this.getFocusBubbleStyles(maskBoxRect, dir)
              }}
              selColor={config.annotationSelectionColor._val}
            />
          </div>
          )
        }

        {/* this is selection effect */}
        {
          config.selectionEffect._val === 'blinking'
          && config.selectionShape._val !== 'pulse'
          && !isCoverAnn(config)
          && <Tags.AnHotspot
            shouldAnimate
            className="blinking-el-mask"
            selColor={config.annotationSelectionColor._val}
            box={maskBoxRect}
            scrollX={this.props.win.scrollX}
            scrollY={this.props.win.scrollY}
            style={{ borderRadius: getComputedStyle(this.props.el).borderRadius || '2px' }}
            onClick={() => {
              const btnConf = config.buttons.filter(button => button.type === 'next')[0];
              this.props.navigateToAdjacentAnn('next', btnConf.id);
            }}
          />
        }
      </>
    );
  }
}

interface AnnotationArrowHeadProps {
  box: Rect;
  pos: AnimEntryDir;
  arrowFill: string;
  arrowStroke: string;
  maskBoxRect: Rect;
  annBox: {
    top: number;
    left: number;
    height: number;
    width: number;
  }
  isBorderColorDefault: boolean;
  annBorderRadius: number;
}

export class AnnotationIndicator extends React.PureComponent<AnnotationArrowHeadProps> {
  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  static ARROW_PADDING = 5;

  static ARROW_SPACE = AnnotationCard.ANNOTAITON_EL_MARGIN - AnnotationIndicator.ARROW_PADDING;

  private TRIANGLE_BASE_SIDE_LENGTH = 200;

  private TRIANGLE_POINTING_SIDE_LENGTH = 100;

  getArrowWidthHeight(): {arrowWidth: number, arrowHeight: number} {
    const arrowSpace = AnnotationIndicator.ARROW_SPACE;
    const ratio = this.TRIANGLE_BASE_SIDE_LENGTH / this.TRIANGLE_POINTING_SIDE_LENGTH;

    const isAnnPosVertical = this.isAnnPosVertical();

    const width = isAnnPosVertical ? arrowSpace * ratio : arrowSpace;
    const height = isAnnPosVertical ? arrowSpace : arrowSpace * ratio;

    return { arrowWidth: width, arrowHeight: height };
  }

  getPositioningStyles(): Record<string, string> {
    const styles: Record<string, string> = {};

    const {
      top: maskBoxTop,
      left: maskBoxLeft,
      width: maskBoxWidth,
      height: maskBoxHeight
    } = this.props.maskBoxRect;

    const arrowPadding = AnnotationIndicator.ARROW_PADDING;

    const arrowLeftOffset = this.props.isBorderColorDefault ? 1 : 0;

    const annPos = this.props.pos;

    const { arrowWidth, arrowHeight } = this.getArrowWidthHeight();

    if (annPos === 'l' || annPos === 'r') {
      let top = this.props.box.top + this.props.box.height / 2 - arrowHeight / 2;
      if (annPos === 'l') {
        styles.left = `${maskBoxLeft - arrowWidth - arrowPadding - arrowLeftOffset}px`;
      } else {
        styles.left = `${maskBoxLeft + maskBoxWidth + arrowPadding + arrowLeftOffset}px`;
      }
      if (top + arrowHeight > this.props.annBox.top + this.props.annBox.height - this.props.annBorderRadius / 2) {
        const diff = (top + arrowHeight) - (this.props.annBox.top + this.props.annBox.height);
        top -= diff + this.props.annBorderRadius;
      } else if (top < this.props.annBox.top + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.top - top;
        top += diff + this.props.annBorderRadius;
      }

      // hide the arrow if the arrow goes out of the el box
      const verCenterOfArrow = top + arrowHeight / 2;
      if (verCenterOfArrow < this.props.maskBoxRect.top
        || verCenterOfArrow > this.props.maskBoxRect.top + this.props.maskBoxRect.height) {
        styles.display = 'none';
      }

      styles.top = `${top}px`;
    } else {
      let left = this.props.box.left + this.props.box.width / 2 - arrowWidth / 2;
      if (annPos === 't') {
        styles.top = `${maskBoxTop - arrowHeight - arrowPadding - arrowLeftOffset}px`;
      } else {
        styles.top = `${maskBoxTop + maskBoxHeight + arrowPadding + arrowLeftOffset}px`;
      }
      if (left + arrowWidth >= this.props.annBox.left + this.props.annBox.width - this.props.annBorderRadius / 2) {
        const diff = (left + arrowWidth) - (this.props.annBox.left + this.props.annBox.width);
        left -= diff + this.props.annBorderRadius;
      } else if (left < this.props.annBox.left + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.left - left;
        left += diff + this.props.annBorderRadius;
      }

      // hide the arrow if the arrow goes out of the el box
      const horCenterOfArrow = left + arrowWidth / 2;
      if (horCenterOfArrow < this.props.maskBoxRect.left
        || horCenterOfArrow > this.props.maskBoxRect.left + this.props.maskBoxRect.width) {
        styles.display = 'none';
      }

      styles.left = `${left}px`;
    }

    return {
      position: 'absolute',
      zIndex: '2',
      ...styles,
    };
  }

  getTransformRotateStyle(): {transform: string} {
    if (this.props.pos === 't' || this.props.pos === 'r') {
      return { transform: 'rotate(180deg)' };
    }
    return { transform: 'rotate(0deg)' };
  }

  isAnnPosVertical = (): boolean => this.props.pos === 't' || this.props.pos === 'b';

  getViewBox(): string {
    if (this.isAnnPosVertical()) {
      return `
      -${this.TRIANGLE_BASE_SIDE_LENGTH / 2} 0 ${this.TRIANGLE_BASE_SIDE_LENGTH} ${this.TRIANGLE_POINTING_SIDE_LENGTH}`;
    }
    return `0 0 ${this.TRIANGLE_POINTING_SIDE_LENGTH} ${this.TRIANGLE_BASE_SIDE_LENGTH}`;
  }

  getTrianglePath = (): string => {
    const CURVE_START_OFFSET = 14;
    const CURVE_VAL = 1;

    if (this.isAnnPosVertical()) {
      const startCurvePoint = {
        x: 0 - CURVE_START_OFFSET,
        y: 0 + CURVE_START_OFFSET
      };
      const endCurvePoint = {
        x: 0 + CURVE_START_OFFSET,
        y: 0 + CURVE_START_OFFSET
      };
      return `
      M-${this.TRIANGLE_BASE_SIDE_LENGTH / 2} ${this.TRIANGLE_POINTING_SIDE_LENGTH}
      L${startCurvePoint.x} ${startCurvePoint.y}
      C${startCurvePoint.x} ${startCurvePoint.y}, 
        0 ${CURVE_VAL}, 
        ${endCurvePoint.x} ${endCurvePoint.y}
      L${endCurvePoint.x} ${endCurvePoint.y}
      L${this.TRIANGLE_BASE_SIDE_LENGTH / 2} ${this.TRIANGLE_POINTING_SIDE_LENGTH}
      Z
      `;
    }

    const startCurvePoint = {
      x: this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_START_OFFSET,
      y: this.TRIANGLE_BASE_SIDE_LENGTH / 2 - CURVE_START_OFFSET
    };
    const endCurvePoint = {
      x: this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_START_OFFSET,
      y: this.TRIANGLE_BASE_SIDE_LENGTH / 2 + CURVE_START_OFFSET
    };
    return `
      M0 0
      L${startCurvePoint.x} ${startCurvePoint.y}
      C${startCurvePoint.x} ${startCurvePoint.y}, 
        ${this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_VAL} ${this.TRIANGLE_BASE_SIDE_LENGTH / 2}, 
        ${endCurvePoint.x} ${endCurvePoint.y}
      L${endCurvePoint.x} ${endCurvePoint.y}
      L0 ${this.TRIANGLE_BASE_SIDE_LENGTH}
      Z
    `;
  };

  render(): JSX.Element {
    const { arrowWidth, arrowHeight } = this.getArrowWidthHeight();

    return (
      <div
        style={{
          ...this.getPositioningStyles(),
          width: `${arrowWidth}px`,
          height: `${arrowHeight}px`
        }}
        ref={this.conRef}
      >
        <svg
          width={`${arrowWidth}px`}
          height={`${arrowHeight}px`}
          viewBox={this.getViewBox()}
          style={{
            ...this.getTransformRotateStyle(),
            verticalAlign: 'top',
            width: `${arrowWidth}px`,
            height: `${arrowHeight}px`,
            filter: 'none',
            margin: 0
          }}
        >
          <path
            className="fab-arr-path"
            stroke={this.props.arrowStroke}
            strokeWidth={4}
            fill={this.props.arrowFill}
            strokeDasharray={270}
            d={this.getTrianglePath()}
          />
        </svg>
      </div>
    );
  }
}

export interface IAnnoationDisplayConfig {
  config: IAnnotationConfig;
  opts: ITourDataOpts,
  isMaximized: boolean;
  isInViewPort: boolean;
  isElVisible: boolean;
  isMediaAnnotation: boolean;
  dimForSmallAnnotation: { w: number, h: number };
  dimForMediumAnnotation: { w: number, h: number };
  dimForLargeAnnotation: { w: number, h: number };
  dimForCustomAnnotation: { w: number, h: number };
  windowHeight: number;
  windowWidth: number;
}

export interface IAnnProps {
  el: HTMLElement;
  hotspotEl: HTMLElement | null;
  box: Rect;
  conf: IAnnoationDisplayConfig;
  hotspotBox?: Rect | null;
  maskBox: Rect | null;
}

interface IConProps {
  data: Array<IAnnProps>,
  nav: NavFn,
  win: Window,
  playMode: boolean,
  tourId: number;
  applyDiffAndGoToAnn: ApplyDiffAndGoToAnn,
  updateCurrentFlowMain: (btnType: IAnnotationButtonType, main?: string)=> void,
  updateJourneyProgress: (annRefId: string)=>void,
  navigateToAnnByRefIdOnSameScreen: NavToAnnByRefIdFn,
  onCompMount: ()=>void,
  isScreenHTML4: boolean,
  shouldSkipLeadForm: boolean,
  getNextAnnotation: (annId: string)=> IAnnotationConfigWithScreenId,
  screenId: number,
}

interface HotspotProps {
  data: Array<{
    win: Window,
    el: HTMLElement,
    hotspotEl: HTMLElement | null,
    opts: ITourDataOpts,
    conf: IAnnotationConfig,
    box: Rect,
    scrollX: number,
    scrollY: number,
    isGranularHotspot: boolean,
    // annotationIndexString: string
  }>,
  playMode: boolean,
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isScreenHTML4: boolean,
}

function handleEventLogging(
  btn: IAnnotationButton,
): void {
  // if there is no hotspot for next button we still consider as cta and raise internal event
  // if next or custom button opens up a link it's considered cta of course
  if ((btn.type === 'custom' || btn.type === 'next') && ((btn.hotspot && btn.hotspot.actionType === 'open') || !btn.hotspot)) {
    emitEvent<Partial<CtaClickedInternal>>(InternalEvents.OnCtaClicked, {
      ctaFrom: CtaFrom.Annotation,
      btnId: btn.id,
      url: btn.hotspot ? btn.hotspot.actionValue._val : '',
      btnTxt: btn.text._val
    });
  }
}

export class AnnotationHotspot extends React.PureComponent<HotspotProps> {
  render(): (JSX.Element | null)[] {
    return this.props.data.map((p, idx) => {
      const btnConf = p.conf.buttons.filter(button => button.type === 'next')[0];
      const [cdx, cdy] = HighlighterBase.getCumulativeDxDy(p.win);
      const maskBoxRect = HighlighterBase.getMaskBoxRect(p.box, p.win, cdx, cdy, this.props.isScreenHTML4);

      /**
       * If we show the annotation in edit mode, the user won't be able to select any
       * element inside the element.
       * For that reason, we have this check where we show the hotspot only when the
       * screen is in play mode or it is a granular hotspot.
       */
      if (this.props.playMode || p.isGranularHotspot) {
        return (
          <Tags.AnHotspot
            style={{ borderRadius: getComputedStyle(p.isGranularHotspot ? p.hotspotEl! : p.el).borderRadius || '2px' }}
            key={p.conf.id}
            box={maskBoxRect}
            selColor={p.conf.annotationSelectionColor._val}
            scrollX={p.scrollX}
            scrollY={p.scrollY}
            shouldAnimate={p.isGranularHotspot}
            className="fable-hotspot"
            onClick={() => {
              this.props.navigateToAdjacentAnn('next', btnConf.id);
            }}
          />
        );
      }

      return null;
    });
  }
}

interface AnnBubbleProps {
  conf: IAnnotationConfig,
  box: Rect,
  navigateToAnnByRefId: NavToAnnByRefIdFn;
  isElVisible: boolean;
  win: Window;
}

export class AnnotationBubble extends React.PureComponent<AnnBubbleProps> {
  render(): (JSX.Element) {
    const bubbleWidth = 18;
    const midPoint = this.props.win.innerHeight / 2;
    const left = this.props.box.left - bubbleWidth / 2;
    let top = this.props.box.top - bubbleWidth / 2;
    if (!this.props.isElVisible) {
      if (top < midPoint) {
        top = 0 - bubbleWidth / 2;
      } else {
        top = this.props.win.innerHeight - bubbleWidth / 2;
      }
    }
    return (
      <>
        <Tags.AnBubble
          style={{
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
          }}
          className="fable-multi-ann-marker"
          onClick={() => {
            this.props.navigateToAnnByRefId(this.props.conf.refId);
          }}
          bubbleWidth={bubbleWidth}
        >
          <FocusBubble diameter={bubbleWidth} selColor={this.props.conf.annotationSelectionColor._val} />
        </Tags.AnBubble>
      </>
    );
  }
}

export class AnnotationCon extends React.PureComponent<IConProps> {
  componentDidMount(): void {
    this.props.onCompMount();
  }

  componentDidUpdate(prevProps: Readonly<IConProps>, prevState: Readonly<{}>, snapshot?: any): void {
    this.props.onCompMount();
  }

  render(): JSX.Element[] {
    return this.props.data.map((p) => {
      if (!p.conf.isMaximized) {
        return <AnnotationBubble
          key={p.conf.config.id}
          conf={p.conf.config}
          box={p.box}
          navigateToAnnByRefId={this.props.navigateToAnnByRefIdOnSameScreen}
          isElVisible={p.conf.isElVisible}
          win={this.props.win}
        />;
      }

      if (!p.conf.isElVisible) return null;

      const isHotspot = p.conf.config.isHotspot;
      const isGranularHotspot = Boolean(isHotspot && p.hotspotBox);

      const navigateToAdjacentAnn: NavigateToAdjacentAnn = (type: 'prev' | 'next' | 'custom', btnId: string): void => {
        const config = p.conf.config;
        // TODO this logic of sending type and btnId and then running a loop to figure out btnConf either by id or by
        // type is weird as a btn can be of only one type and has unique id. Only btnId is sufficient in this case
        const btnConf = type === 'custom'
          ? config.buttons.filter(button => button.id === btnId)[0]
          : config.buttons.filter(button => button.type === type)[0];

        handleEventLogging(btnConf);

        let newBtnConf = btnConf;
        let annConfig = p.conf.config;
        const navType = btnConf.type;
        if (this.props.shouldSkipLeadForm && (navType === 'next' || navType === 'prev')) {
          while (this.props.shouldSkipLeadForm) {
            if (!newBtnConf.hotspot || newBtnConf.hotspot.actionType === 'open') {
              break;
            }
            const [goToScreenId, goToAnnId] = newBtnConf.hotspot.actionValue._val.split('/');
            annConfig = this.props.getNextAnnotation(goToAnnId);
            if (!annConfig.isLeadFormPresent) {
              break;
            } else {
              newBtnConf = getAnnotationBtn(annConfig, navType)!;
            }
          }
        }

        if (btnConf.type === 'next') {
          this.props.updateJourneyProgress(annConfig.refId);
        }

        if (!newBtnConf.hotspot) {
          if (this.props.playMode) {
            this.props.updateCurrentFlowMain(newBtnConf.type);
          }
          return;
        }

        if (newBtnConf.hotspot && newBtnConf.hotspot.actionType === 'open') {
          if (newBtnConf.type === 'custom') {
            const nextBtn = getAnnotationBtn(annConfig, 'next');
            const isLastAnnotation = !nextBtn || nextBtn.hotspot === null || nextBtn.hotspot.actionType === 'open';
            if (isLastAnnotation) {
              this.props.updateCurrentFlowMain(newBtnConf.type);
            }
          } else {
            this.props.updateCurrentFlowMain(newBtnConf.type);
          }
        }

        if ((type === 'custom' && newBtnConf.hotspot.actionType === 'open') || !this.props.playMode) {
          this.props.nav(
            newBtnConf.hotspot.actionValue._val,
            newBtnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs',
            newBtnConf.hotspot.openInSameTab
          );
          return;
        }

        if ((newBtnConf.type === 'next' || newBtnConf.type === 'prev' || newBtnConf.type === 'custom')
          && newBtnConf.hotspot.actionType === 'navigate'
        ) {
          this.props.applyDiffAndGoToAnn(config.refId, newBtnConf.hotspot.actionValue._val);
        } else {
          this.props.nav(newBtnConf.hotspot.actionValue._val, 'abs', newBtnConf.hotspot.openInSameTab);
        }
      };

      if (p.conf.config.isLeadFormPresent && this.props.playMode && this.props.shouldSkipLeadForm) {
        const nextBtn = getAnnotationBtn(p.conf.config, 'next')!;
        navigateToAdjacentAnn('next', nextBtn.id);
        return null;
      }

      return (
        <div
          key={p.conf.config.refId}
          style={{
            position: 'absolute',
            zIndex: '2',
          }}
        >
          {
            isHotspot && <AnnotationHotspot
              data={[{
                win: this.props.win,
                el: p.el,
                hotspotEl: p.hotspotEl,
                opts: p.conf.opts,
                conf: p.conf.config,
                box: isGranularHotspot ? p.hotspotBox! : p.box,
                scrollX: this.props.win.scrollX,
                scrollY: this.props.win.scrollY,
                isGranularHotspot,
                // annotationIndexString: p.annotationSerialIdMap[p.conf.config.refId]
              }]}
              playMode={this.props.playMode}
              navigateToAdjacentAnn={navigateToAdjacentAnn}
              isScreenHTML4={this.props.isScreenHTML4}
            />
          }
          <AnnotationCard
            el={p.el}
            // annotationSerialIdMap={p.annotationSerialIdMap}
            annotationDisplayConfig={p.conf}
            box={p.box}
            win={this.props.win}
            playMode={this.props.playMode}
            tourId={this.props.tourId}
            navigateToAdjacentAnn={navigateToAdjacentAnn}
            maskBox={p.maskBox}
            isScreenHTML4={this.props.isScreenHTML4}
            screenId={this.props.screenId}
          />
        </div>
      );
    }).filter(el => el) as JSX.Element[];
  }
}
