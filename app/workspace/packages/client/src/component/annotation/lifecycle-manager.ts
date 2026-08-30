import ReactDOM, { Root } from 'react-dom/client';
import { IAnnotationButtonType, IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { StyleSheetManager } from 'styled-components';
import { ScreenType } from '@fable/common/dist/api-contract';
import { sleep } from '@fable/common/dist/utils';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import HighlighterBase, { HighlighterBaseConfig, Rect } from '../base/hightligher-base';
import { IAnnoationDisplayConfig, AnnotationCon, AnnotationContent, IAnnProps } from '.';
import { AnnotationPerScreen, ElPathKey, INTERACTIVE_MODE, NavFn } from '../../types';
import { isBodyEl, isMediaAnnotation } from '../../utils';
import {
  DEFAULT_DIMS_FOR_ANN,
  createFableRtUmbrlDivWrapper,
  getFableRtUmbrlDiv,
  getFableRtUmbrlDivWrapper,
  scrollToAnn
} from './utils';
import { ApplyDiffAndGoToAnn, NavToAnnByRefIdFn } from '../screen-editor/types';
import { AnnElsVisibilityObserver } from './ann-els-visibility-observer';
import { AllDimsForAnnotation } from './types';
import { FABLE_IFRAME_GENERIC_CLASSNAME } from '../../constants';
import { P_RespScreen } from '../../entity-processor';
import { IAnnotationConfigWithScreenId } from './annotation-config-utils';

const scrollIntoView = require('scroll-into-view');

export enum AnnotationViewMode {
  Show,
  Hide
}

interface SelInf { id: string; cls: string, isOurId: boolean, hotspotCls?: string }

export default class AnnotationLifecycleManager extends HighlighterBase {
  static SCROLL_TO_EL_TIME_MS = 350;

  private annotationElMap: Record<string, [HTMLElement, IAnnoationDisplayConfig]>;

  // TODO since theme is global across the annotations, we keep only once instance of this.
  //      we reingest the theme on every render. Handle it in a better way
  private opts: ITourDataOpts;

  private con: HTMLDivElement;

  private rRoot: Root;

  private conProbe: HTMLDivElement;

  private rRootProbe: Root;

  private mode: AnnotationViewMode;

  private nav: NavFn;

  private navigateToAnnByRefIdOnSameScreen: NavToAnnByRefIdFn;

  private componentDisposed = false;

  private isAnnotationDrawingInProgress = false;

  private isPlayMode: boolean;

  private screenType: ScreenType;

  private allAnnotationsForTour: AnnotationPerScreen[];

  private tourId: number;

  private applyDiffAndGoToAnn: ApplyDiffAndGoToAnn;

  private undoLastAnnStyleOverride: Array<() => void> = [];

  private updateCurrentFlowMain: (btnType: IAnnotationButtonType, main?:string)=> void;

  private annElsVisibilityObserver: AnnElsVisibilityObserver;

  private iframeElsScrollTimeoutId: number;

  private elPathKey: ElPathKey;

  private screen: P_RespScreen;

  private shouldSkipLeadForm: boolean;

  private updateJourneyProgress: (annRefId: string)=> void;

  private getNextAnnotation: (annId: string) => IAnnotationConfigWithScreenId;

  private interactiveMode: INTERACTIVE_MODE;

  static getFablePrefixedClsName(cls: string): string {
    return `f-c-${cls}`;
  }

  static getFablePrefixedId(id: string): string {
    return `f-i-${id}`;
  }

  static getCompositeSelector(el: HTMLElement, config: IAnnotationConfig): [
    compositeSelector: string,
    selectorInf: SelInf
  ] {
    let isOurId = false;
    let id = el.getAttribute('id');
    if (!id) {
      id = AnnotationLifecycleManager.getFablePrefixedId(config.refId);
      isOurId = true;
    }
    const cls = AnnotationLifecycleManager.getFablePrefixedClsName(config.refId);
    let hotspotCls: string | undefined;
    if (config.hotspotElPath) {
      hotspotCls = 'fable-hotspot';
    }
    return [`#${id}.${cls}`, {
      isOurId,
      id,
      cls,
      hotspotCls
    }];
  }

  static compileCSSForEffect(effect: string | undefined, config: IAnnotationConfig): string {
    if (!effect) return '';
    effect = effect.replaceAll(
      '{{f-actn-idr--not-selected-subtree}}',
      '.f-fable-an-t-path > :not(.f-fable-an-t-path, .f-fable-an-target)'
    );
    effect = effect.replaceAll(
      '{{f-actn-idr--selected-subtree}}',
      '.f-fable-an-target'
    );
    effect = effect.replaceAll(
      '{{f-actn-idr--selected-subtree-hss}}',
      `.${this.getFablePrefixedClsName(config.refId)}.f-fable-an-target`
    );
    effect = effect.replaceAll(
      '{{f-actn-idr--ann-card-con}}',
      `.f-a-c-${config.refId}.fable-ann-card`
    );
    return effect;
  }

  // Take the initial annotation config from here
  constructor(
    doc: Document,
    nestedFrames: HTMLIFrameElement[],
    opts: { navigate: NavFn, isPlayMode: boolean, navigateToAnnByRefIdOnSameScreen: (refId: string) => void },
    screenType: ScreenType,
    allAnnotationsForTour: AnnotationPerScreen[],
    tourDataOpts: ITourDataOpts,
    tourId: number,
    config: HighlighterBaseConfig,
    applyDiffAndGoToAnnFn: ApplyDiffAndGoToAnn,
    updateCurrentFlowMain: (btnType: IAnnotationButtonType, main?: string)=> void,
    updateJourneyProgress: (annRefId: string) => void,
    elPathKey: ElPathKey,
    isScreenHTML4: boolean,
    screen: P_RespScreen,
    shouldSkipLeadForm: boolean,
    getNextAnnotation: (annId: string)=>IAnnotationConfigWithScreenId,
    interactiveMode: INTERACTIVE_MODE
  ) {
    super(doc, nestedFrames, config, isScreenHTML4);
    this.screen = screen;
    this.opts = tourDataOpts;
    this.elPathKey = elPathKey;
    this.annElsVisibilityObserver = new AnnElsVisibilityObserver(this.elVisibleHandler, this.elNotVisibleHandler);
    this.nav = opts.navigate;
    this.navigateToAnnByRefIdOnSameScreen = opts.navigateToAnnByRefIdOnSameScreen;
    this.annotationElMap = {};
    const [con, root] = this.createContainerRoot('');
    const [conProbe, rootProbe] = this.createContainerRoot('ann-probe');
    this.con = con;
    this.rRoot = root;
    this.conProbe = conProbe;
    this.rRootProbe = rootProbe;
    this.mode = AnnotationViewMode.Hide;
    this.isPlayMode = opts.isPlayMode;
    this.screenType = screenType;
    this.allAnnotationsForTour = allAnnotationsForTour;
    this.tourId = tourId;
    this.applyDiffAndGoToAnn = applyDiffAndGoToAnnFn;
    this.updateCurrentFlowMain = updateCurrentFlowMain;
    this.updateJourneyProgress = updateJourneyProgress;
    this.iframeElsScrollTimeoutId = 0;
    this.shouldSkipLeadForm = shouldSkipLeadForm;
    this.getNextAnnotation = getNextAnnotation;
    this.interactiveMode = interactiveMode;
    if (this.screenType === ScreenType.SerDom) {
      this.setFramesScrollListeners();
    }
  }

  updateNestedFrames(nestedFrames: HTMLIFrameElement[]): void {
    this.resetFramesScrollListeners();
    this.setNestedFrames(nestedFrames);
    this.setFramesScrollListeners();
  }

  setFramesScrollListeners(): void {
    this.win.addEventListener('scroll', this.onIframeElsScroll, true);
    this.doc.body.addEventListener('scroll', this.onIframeElsScroll, true);
    this.nestedFrames.forEach(frame => {
      const doc2 = frame.contentDocument!;
      const win2 = doc2.defaultView!;
      win2.addEventListener('scroll', this.onIframeElsScroll, true);
      doc2.body.addEventListener('scroll', this.onIframeElsScroll, true);
    });
  }

  resetFramesScrollListeners(): void {
    this.win.removeEventListener('scroll', this.onIframeElsScroll, true);
    this.doc.body.removeEventListener('scroll', this.onIframeElsScroll, true);
    this.nestedFrames.forEach(frame => {
      const doc2 = frame.contentDocument;
      const win2 = doc2?.defaultView;
      win2?.removeEventListener('scroll', this.onIframeElsScroll, true);
      doc2?.body.removeEventListener('scroll', this.onIframeElsScroll, true);
    });
  }

  setElVisibilityInAnnElMap(el: HTMLElement, isElVisible: boolean): void {
    const currentEl = Object.entries(this.annotationElMap).find(([_, [currEl]]) => currEl === el);
    if (!currentEl) return;
    const anFromElMapKey = currentEl[0];
    this.annotationElMap[anFromElMapKey][1].isElVisible = isElVisible;
  }

  elVisibleHandler = (el: HTMLElement): void => {
    this.setElVisibilityInAnnElMap(el, true);
  };

  elNotVisibleHandler = (el: HTMLElement): void => {
    this.setElVisibilityInAnnElMap(el, false);
  };

  resetCons(): void {
    let umbrellaDiv = getFableRtUmbrlDivWrapper(this.doc) as HTMLDivElement;
    if (!umbrellaDiv) {
      umbrellaDiv = createFableRtUmbrlDivWrapper(this.doc);
      // Before resetting the react managed dom objects we have to delete any existing managed objects that might have
      // been created by react before. This is a critical step to clear out any listener.
      // Our keyboard events depends on this listener creation
      new Promise(done => {
        setTimeout(() => {
          this.disposeMountPoint();
          done(1);
        }, 0);
      }).then(() => {
        const [con, root] = this.createContainerRoot('');
        const [conProbe, rootProbe] = this.createContainerRoot('ann-probe');
        this.con = con;
        this.rRoot = root;
        this.conProbe = conProbe;
        this.rRootProbe = rootProbe;
        this.createMask();
      });
    }
  }

  private hideAllAnnotations(): void {
    this.undoLastAnnStyleOverride.forEach(f => f());
    for (const [, [_, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.isMaximized = false;
    }
  }

  hide(playMode: boolean = false): void {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
    if (playMode) this.updateConfig('showOverlay', false);
    else {
      this.removeMaskIfPresent();
      this.clearAnnElMap();
    }
    this.hideAllAnnotations();
  }

  hideAnnButKeepMask(): void {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
    this.hideAllAnnotations();
    this.createFullScreenMask();
  }

  getVp(): {w: number, h: number} {
    return {
      w: this.win.innerWidth || 0,
      h: this.win.innerHeight || 0
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getBoundingRectWrtRootFrame(el: HTMLElement): Rect {
    const doc = el.ownerDocument;
    const [dx, dy] = this.getCumulativeDxdy(doc);
    const box = el.getBoundingClientRect();
    return {
      x: box.x + dx,
      y: box.y + dy,
      top: box.top + dy,
      bottom: box.bottom + dy,
      left: box.left + dx,
      right: box.right + dx,
      height: box.height,
      width: box.width,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  maskHasDarkBg(): boolean {
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  highlightBgColor(): string {
    return '#ffffff00';
  }

  private beforeScrollStart = (): void => {
    if (!this.isPlayMode) {
      return;
    }
    this.updateConfig('selectionColor', 'transparent');
    this.con!.style.visibility = 'hidden';
    this.createFullScreenMask();
  };

  // eslint-disable-next-line class-methods-use-this
  private getAncestorsFromExclusive(el: HTMLElement): HTMLElement[] {
    const allAncestors: HTMLElement[] = [];
    let ptr = el.parentNode;
    while (ptr) {
      if (ptr.nodeName === '#document') {
        const tEl = ptr as Document;
        if (tEl.defaultView
          && tEl.defaultView!.frameElement
          && !(tEl.defaultView!.frameElement as HTMLIFrameElement).classList.contains(FABLE_IFRAME_GENERIC_CLASSNAME)
        ) {
          ptr = tEl.defaultView.frameElement;
        } else break;
      }
      if (ptr.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        ptr = (ptr as ShadowRoot).host;
      }
      if (!(ptr.nodeName === 'BODY'
        || ptr.nodeName === 'HEAD'
        || ptr.nodeName === 'HTML'
        || ptr.nodeName === 'IFRAME'
        || ptr.nodeName === 'FRAME'
        || ptr.nodeName === 'OBJECT'
      )) {
        allAncestors.push(ptr as HTMLElement);
      }
      ptr = ptr.parentNode;
    }

    return allAncestors;
  }

  // algorithm: https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity#how_is_specificity_calculated
  // Target element receives f-fable-an-target class.
  // The ancestors receives f-fable-an-t-path class.
  // Use this to form selection of subtree. Ex the following code selects all subtree but the target one
  //  .f-fable-an-t-path > :not(.f-fable-an-t-path, .f-fable-an-target) {
  //    background: rgba(0, 0, 0, 0.15);
  //    filter: blur(1px);
  //  }
  //
  // eslint-disable-next-line class-methods-use-this
  private setCssSelectorForHighestProbalbleSpecificity(el: HTMLElement, config: IAnnotationConfig): () => void {
    const [, sel] = AnnotationLifecycleManager.getCompositeSelector(el, config);

    if (sel.isOurId) {
      el.setAttribute('id', sel.id);
    }
    el.classList.add(sel.cls);
    el.classList.add('f-fable-anim-target');
    el.classList.add('f-fable-an-target');
    const ancestors = this.getAncestorsFromExclusive(el);
    for (const ancestorEl of ancestors) {
      try {
        ancestorEl.classList.add('f-fable-an-t-path');
      } catch (e) {
        raiseDeferredError(e as Error);
      }
    }
    return () => {
      if (sel.isOurId) el.removeAttribute('id');
      el.classList.remove(sel.cls);
      el.classList.remove('f-fable-anim-target');
      el.classList.remove('f-fable-an-target');
      for (const ancestorEl of ancestors) {
        try {
          ancestorEl.classList.remove('f-fable-an-t-path');
        } catch (e) {
          raiseDeferredError(e as Error);
        }
      }
    };
  }

  private static readonly ANIM_ONLY_CSS = `
.f-fable-anim-target, .f-fable-anim-target * {
  transition: all 0.3s ease-out;
}
`.trim();

  private exportTourThemeAsCssVar(cssVarsLoc: 'root' | 'host'): string {
    const padding = this.opts.annotationPadding._val;
    const match = padding.match(/\s*(\d+)\s+(\d+)\s*/);
    let padX = 0;
    let padY = 0;
    if (match) {
      padY = +match[1];
      padX = +match[2];
      padX = Number.isNaN(padX) ? 0 : padX;
      padY = Number.isNaN(padY) ? 0 : padY;
    }

    return `
:${cssVarsLoc} {
  --fable-primary-color: ${this.opts.primaryColor._val};
  --fable-selection-color: ${this.config.selectionColor};
  --fable-ann-bg-color: ${this.opts.annotationBodyBackgroundColor._val};
  --fable-ann-border-color: ${this.opts.annotationBodyBorderColor._val};
  --fable-ann-font-color: ${this.opts.annotationFontColor._val};
  --fable-ann-border-radius: ${this.opts.borderRadius._val};
  --fable-ann-con-pad-x: ${padX};
  --fable-ann-con-pad-y: ${padY};
}

`;
  }

  private addCustomStyleSheetFor(el: HTMLElement, config: IAnnotationConfig, styleStr: string): () => void {
    if (!styleStr) return () => {};

    this.updateConfig('showOverlay', false);

    this.updateConfig('selectionColor', 'transparent');

    const doc = el.ownerDocument;
    let styleTag = doc.getElementById('f-fable-override-eph-style');
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.setAttribute('id', 'f-fable-override-eph-style');
      if (doc.body) doc.body.appendChild(styleTag);
    }
    const compiledStyleStr = AnnotationLifecycleManager.compileCSSForEffect(styleStr, config);
    styleTag.innerHTML = AnnotationLifecycleManager.ANIM_ONLY_CSS + this.exportTourThemeAsCssVar('root') + compiledStyleStr;

    return () => {
      if (styleTag) styleTag.innerHTML = AnnotationLifecycleManager.ANIM_ONLY_CSS + this.exportTourThemeAsCssVar('root');
      this.updateConfig('showOverlay', config.showOverlay);
      this.updateConfig('showMaskBorder', !config.showOverlay);
      this.updateConfig('selectionColor', this.config.selectionColor);
      !this.isPlayMode && this.render();
    };
  }

  previewCustomStyle(css: string, el: HTMLElement, config: IAnnotationConfig): () => void {
    const undo2 = this.addCustomStyleSheetFor(el, config, css);
    const undo1 = this.setCssSelectorForHighestProbalbleSpecificity(el, config);
    return () => {
      undo1();
      undo2();
    };
  }

  addAnnStyleTag(styleStr: string, config: IAnnotationConfig):void {
    const fableAnnOverrideStyleTagId = 'f-fable-override-ann-style';
    const umbrlDiv = getFableRtUmbrlDiv(this.doc)!;
    let styleTag = umbrlDiv.querySelector(`#${fableAnnOverrideStyleTagId}`);
    if (!styleTag) {
      styleTag = this.doc.createElement('style');
      styleTag.setAttribute('id', fableAnnOverrideStyleTagId);
      umbrlDiv.prepend(styleTag);
    }
    const compiledStyleStr = AnnotationLifecycleManager.compileCSSForEffect(styleStr, config);
    styleTag.innerHTML = this.exportTourThemeAsCssVar('host') + compiledStyleStr;
  }

  private onScrollComplete = (el: HTMLElement, config: IAnnotationConfig): void => {
    this.mode = AnnotationViewMode.Show;
    this.setElVisibilityInAnnElMap(el, true);
    this.render();
    this.addAnnStyleTag(config.annCSSStyle, config);
    this.con!.style.visibility = 'visible';
    const undo1 = this.addCustomStyleSheetFor(el, config, config.targetElCssStyle);
    const undo2 = this.setCssSelectorForHighestProbalbleSpecificity(el, config);
    this.undoLastAnnStyleOverride.push(undo1, undo2);
  };

  private checkIfAllScrollsComplete = async (el: HTMLElement, config: IAnnotationConfig): Promise<void> => {
    let lastScrollingTs = +new Date();
    let intervalId;

    const scrollHandler = (): void => {
      lastScrollingTs = +new Date();
    };

    this.doc.addEventListener('scroll', scrollHandler);
    this.doc.body.addEventListener('scroll', scrollHandler);
    this.nestedDocs.forEach(doc => {
      doc.addEventListener('scroll', scrollHandler);
      doc.body && doc.body.addEventListener('scroll', scrollHandler);
    });

    await Promise.race([
      new Promise((resolve) => {
        intervalId = setInterval(() => {
          if (+new Date() - lastScrollingTs > 100) {
            resolve(1);
          }
        }, 48);
      }),
      sleep(3000)
    ]);

    clearInterval(intervalId);
    this.doc.removeEventListener('scroll', scrollHandler);
    this.doc.body.removeEventListener('scroll', scrollHandler);
    this.nestedDocs.forEach(doc => {
      doc.removeEventListener('scroll', scrollHandler);
      doc.body && doc.body.removeEventListener('scroll', scrollHandler);
    });

    this.onScrollComplete(el, config);
  };

  private onIframeElsScroll = (ev: Event): void => {
    const fableCard = this.doc.querySelector('#fable-ann-card-rendered');
    if (fableCard && ev.target) {
      if (fableCard.contains(ev.target as HTMLElement)) return;
    }

    if (this.mode === AnnotationViewMode.Hide) return;
    this.con!.style.display = 'none';
    this.createFullScreenMask();
    clearTimeout(this.iframeElsScrollTimeoutId);
    this.iframeElsScrollTimeoutId = setTimeout(() => {
      this.render();
    }, 48) as unknown as number;
  };

  private createContainerRoot(type: '' | 'ann-probe' | 'ann-video' = ''): [HTMLDivElement, Root] {
    const con = this.doc.createElement('div');
    con.setAttribute('class', `fable-annotations-${type}-container`);
    con.setAttribute('fable-ignr-sel', 'true');
    con.style.position = 'absolute';
    con.style.left = '0';
    con.style.top = '0';
    con.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    this.attachElToUmbrellaDiv(con);
    const rRoot = ReactDOM.createRoot(con, { identifierPrefix: `${this.screen.id}` });
    return [con, rRoot];
  }

  private showAnnotationFor(el: HTMLElement, config: IAnnotationConfig): void {
    this.undoLastAnnStyleOverride.forEach(f => f());

    const currId = config.id;

    for (const [id, [, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.opts = this.opts;
      if (id === currId) {
        annotationDisplayConfig.isMaximized = true;
        annotationDisplayConfig.isInViewPort = true;
      } else {
        annotationDisplayConfig.isMaximized = false;
        annotationDisplayConfig.isInViewPort = false;
      }
    }

    if (this.screenType === ScreenType.Img && config.type === 'default') {
      const coordsStr = config.id;
      this.beforeScrollStart();
      const [x, y, width, height] = coordsStr.split('-');
      const box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      scrollToAnn(this.win, box, this.annotationElMap[coordsStr][1]);
      const timer = setTimeout(() => {
        this.checkIfAllScrollsComplete(el, config);
        clearTimeout(timer);
      }, AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS / 2);
      return;
    }

    if (config.scrollAdjustment === 'sticky') {
      this.checkIfAllScrollsComplete(el, config);
      return;
    }

    this.beforeScrollStart();
    // we don't use el.scrollIntoView directly as it moves whole page layout if we want to keep the target el in center.
    // Fable's tour is embedded in iframe of customer's page, we can't let the document scroll outside fable's iframe.
    // el.scrollIntoView does not allow us to provide any boundary.
    //
    // We detect body element and then don't apply scroll as the library we use sometime scrolls the page all the way to
    // the bottom of the page when body is selected.
    //
    // WARN Determining the nested scroll level through multiple container is a tricky problem across brower and across
    // different dom elments (iframe / showdow root). For the interest of the time we did not solve ourself and used the
    // scroll-into-view library. This library is not audited. TODO Later on, fix this ourself
    if (!isBodyEl(el)) {
      scrollIntoView(el, {
        time: AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS,
        align: {
          top: 0.2,
        }
      }, (type: 'complete' | 'canceled') => {
        this.checkIfAllScrollsComplete(el, config);
      });
    } else {
      this.win.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      const timer = setTimeout(
        () => {
          this.checkIfAllScrollsComplete(el, config);
          clearTimeout(timer);
        },
        AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS / 2
      );
    }
  }

  private render(): void {
    if (this.mode === AnnotationViewMode.Hide) {
      return;
    }
    if (this.componentDisposed) {
      return;
    }
    const props: IAnnProps[] = [];
    for (const [_, [el, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      let box: Rect;
      let maskBox: Rect | null = null;
      if (this.screenType === ScreenType.Img && annotationDisplayConfig.config.type === 'default') {
        const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
        box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      } else {
        box = this.getBoundingRectWrtRootFrame(el);
      }

      let hotspotEl = null;
      const hotspotElPath = annotationDisplayConfig.config.hotspotElPath;
      if (hotspotElPath && annotationDisplayConfig.isMaximized) {
        hotspotEl = this.elFromPath(hotspotElPath);
      }

      if (annotationDisplayConfig.isMaximized) {
        this.updateConfig('showOverlay', annotationDisplayConfig.config.showOverlay);
        this.updateConfig('showMaskBorder', !annotationDisplayConfig.config.showOverlay);
        if (
          annotationDisplayConfig.config.selectionShape._val === 'pulse'
          || annotationDisplayConfig.config.selectionEffect._val === 'blinking'
        ) {
          this.updateConfig('selectionColor', 'transparent');
        } else if (hotspotElPath && annotationDisplayConfig.config.isHotspot) {
          this.updateConfig('selectionColor', '#ffffff00');
        } else {
          this.updateConfig('selectionColor', annotationDisplayConfig.config.annotationSelectionColor._val);
        }
        if (annotationDisplayConfig.config.type === 'cover') {
          this.createFullScreenMask();
        } else if (this.screenType === ScreenType.Img) {
          const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
          this.selectBoxInDoc({ x: +x, y: +y, width: +width, height: +height });
        } else if (annotationDisplayConfig.isElVisible) {
          this.selectElementInDoc(el, el.ownerDocument);
        }
      }

      if (this.maskEl) {
        maskBox = this.getBoundingRectWrtRootFrame(this.maskEl);
      }

      props.push({
        el,
        hotspotEl,
        box,
        conf: annotationDisplayConfig,
        hotspotBox: hotspotEl ? this.getBoundingRectWrtRootFrame(hotspotEl) : null,
        maskBox
      });
    }

    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },
        React.createElement(AnnotationCon, {
          data: props,
          nav: this.nav,
          navigateToAnnByRefIdOnSameScreen: this.navigateToAnnByRefIdOnSameScreen,
          win: this.win,
          playMode: this.isPlayMode,
          tourId: this.tourId,
          applyDiffAndGoToAnn: this.applyDiffAndGoToAnn,
          updateCurrentFlowMain: this.updateCurrentFlowMain,
          updateJourneyProgress: this.updateJourneyProgress,
          onCompMount: () => { this.con.style.display = ''; },
          isScreenHTML4: this.isScreenHTML4,
          shouldSkipLeadForm: this.shouldSkipLeadForm,
          getNextAnnotation: this.getNextAnnotation,
          screenId: this.screen.id
        })
      )
    );
  }

  async addOrReplaceAnnotation(
    el: HTMLElement,
    config: IAnnotationConfig,
    multiAnnConfigs: IAnnotationConfig[],
    opts: ITourDataOpts,
    showImmediate = false,
  ): Promise<void> {
    if (this.isAnnotationDrawingInProgress) {
      return;
    }
    this.isAnnotationDrawingInProgress = true;
    const dim = await this.probeForAnnotationSize(config, opts);

    if (!this.componentDisposed) {
      this.clearAnnElMap();
      this.opts = opts;
      this.setAnnElMapVal(config, dim, opts);
      multiAnnConfigs.forEach(conf => {
        this.setAnnElMapVal(conf, DEFAULT_DIMS_FOR_ANN, opts);
      });
      if (showImmediate) {
        this.showAnnotationFor(el, config);
      }
    }

    this.isAnnotationDrawingInProgress = false;
  }

  private setAnnElMapVal(
    config: IAnnotationConfig,
    dim: AllDimsForAnnotation,
    opts: ITourDataOpts,
    prerender: boolean = false,
  ): IAnnoationDisplayConfig {
    const key = config.id;
    const vp = this.getVp();

    let el;
    if (prerender) {
      el = this.doc.createElement('div');
    } else {
      el = this.getElFromAnnConfig(config, this.elPathKey);
    }

    const displayConf = {
      config,
      opts,
      isMaximized: false,
      isInViewPort: false,
      prerender,
      isMediaAnnotation: isMediaAnnotation(config, this.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO),
      dimForSmallAnnotation: { ...dim.dimForSmallAnnotation },
      dimForMediumAnnotation: { ...dim.dimForMediumAnnotation },
      dimForLargeAnnotation: { ...dim.dimForLargeAnnotation },
      dimForCustomAnnotation: { ...dim.dimForCustomAnnotation },
      windowHeight: vp.h,
      windowWidth: vp.w,
      isElVisible: true,
    };
    this.annotationElMap[key] = [el, displayConf];

    if (this.screenType === ScreenType.SerDom && config.type === 'default') {
      this.annElsVisibilityObserver.observe(el);
    }

    return displayConf;
  }

  private getElFromAnnConfig(config: IAnnotationConfig, elPathKey: ElPathKey): HTMLElement {
    let el: HTMLElement;
    if (this.screenType === ScreenType.Img && config.type === 'default') {
      el = this.doc.querySelector('img')!;
    } else if (config.type === 'cover') {
      el = this.doc.querySelector('body')!;
    } else {
      el = this.elFromPath(config[elPathKey])!;
    }
    return el;
  }

  private clearAnnElMap(): void {
    const entriesToClear = Object.entries(this.annotationElMap).map(el => el);

    entriesToClear.forEach(entry => {
      const el = entry[1][0];
      const config = entry[1][1].config;
      if (this.screenType === ScreenType.SerDom && config.type === 'default') {
        this.annElsVisibilityObserver.unobserve(el);
      }
      delete this.annotationElMap[entry[0]];
    });
  }

  private getAnnWidths(annType: 'default' | 'cover')
  : {smallWidth: number, mediumWidth: number, largeWidth: number} {
    const vp = this.getVp();

    if (this.elPathKey === 'id') {
      const smallWidth = 256;
      const mediumWidth = 340;
      const largeWidth = 480;

      return {
        smallWidth,
        mediumWidth,
        largeWidth
      };
    }

    // for mobile
    const width = annType === 'default' ? AnnotationContent.WIDTH_MOBILE : (vp.w - 60);
    return {
      smallWidth: width,
      mediumWidth: width,
      largeWidth: width
    };
  }

  private async probeForAnnotationSize(config: IAnnotationConfig, opts: ITourDataOpts): Promise<AllDimsForAnnotation> {
    const { smallWidth, mediumWidth, largeWidth } = this.getAnnWidths(config.type);
    const isMediaAnn = isMediaAnnotation(config, this.interactiveMode === INTERACTIVE_MODE.INTERACTIVE_VIDEO);
    const customWidth = config.customDims.width;

    try {
      const rs: Array<(e: HTMLDivElement) => void> = [];
      const ps = Promise.all([
        new Promise((resolve: (e: HTMLDivElement) => void, re) => {
          rs.push(resolve);
        }),
        new Promise((resolve: (e: HTMLDivElement) => void) => {
          rs.push(resolve);
        }),
        new Promise((resolve: (e: HTMLDivElement) => void) => {
          rs.push(resolve);
        }),
        new Promise((resolve: (e: HTMLDivElement) => void) => {
          rs.push(resolve);
        }),
      ]);

      const r = Math.random() * (10 ** 6) | 0;
      this.rRootProbe.render(
        React.createElement(
          StyleSheetManager,
          { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },
          React.createElement(
            'div',
            {},
            React.createElement(AnnotationContent, {
              onRender: rs[0],
              isInDisplay: true,
              config,
              dir: 't',
              opts,
              width: smallWidth,
              top: -9999,
              left: -9999,
              key: `${config.refId}-sm-${r}`,
              tourId: this.tourId,
              navigateToAdjacentAnn: () => {},
              doc: this.doc,
              isProbing: true,
              isMediaAnn
            }),
            React.createElement(AnnotationContent, {
              onRender: rs[1],
              isInDisplay: true,
              config,
              dir: 't',
              opts,
              width: mediumWidth,
              top: -9999,
              left: -9999,
              key: `${config.refId}-md-${r}`,
              tourId: this.tourId,
              navigateToAdjacentAnn: () => {},
              doc: this.doc,
              isProbing: true,
              isMediaAnn
            }),
            React.createElement(AnnotationContent, {
              onRender: rs[2],
              isInDisplay: true,
              config,
              opts,
              dir: 't',
              width: largeWidth,
              top: -9999,
              left: -9999,
              key: `${config.refId}-lg-${r}`,
              tourId: this.tourId,
              navigateToAdjacentAnn: () => {},
              doc: this.doc,
              isProbing: true,
              isMediaAnn
            }),
            React.createElement(AnnotationContent, {
              onRender: rs[3],
              isInDisplay: true,
              config,
              opts,
              dir: 't',
              width: customWidth,
              top: -9999,
              left: -9999,
              key: `${config.refId}-custom-${r}`,
              tourId: this.tourId,
              navigateToAdjacentAnn: () => {},
              doc: this.doc,
              isProbing: true,
              isMediaAnn
            })
          )
        )
      );

      const [elSmall, elMedium, elLarge, elCustom] = await ps;
      const smallDim = elSmall.getBoundingClientRect();
      const mediumDim = elMedium.getBoundingClientRect();
      const largeDim = elLarge.getBoundingClientRect();
      const customDim = elCustom.getBoundingClientRect();

      return {
        dimForSmallAnnotation: { w: smallDim.width, h: smallDim.height },
        dimForMediumAnnotation: { w: mediumDim.width, h: mediumDim.height },
        dimForLargeAnnotation: { w: largeDim.width, h: largeDim.height },
        dimForCustomAnnotation: { w: customDim.width, h: customDim.height },
      };
    } catch (e) {
      if (!this.componentDisposed) {
        // Sometime there might be errors because component will get unmounted but rendering won't finish
        // we would ignore this. Not ideal, but here we are
        throw e;
      }
    }

    return {
      dimForSmallAnnotation: { w: 0, h: 0 },
      dimForMediumAnnotation: { w: 0, h: 0 },
      dimForLargeAnnotation: { w: 0, h: 0 },
      dimForCustomAnnotation: { w: 0, h: 0 },
    };
  }

  public dispose(): void {
    this.componentDisposed = true;
    const timer = setTimeout(() => {
      this.disposeMountPoint();
      if (this.screenType === ScreenType.SerDom) {
        this.resetFramesScrollListeners();
      }
      this.annElsVisibilityObserver.unobserveAllEls();
      super.dispose();
      clearTimeout(timer);
    });
  }

  private disposeMountPoint() {
    if (this.rRoot) {
      this.rRoot.unmount();
      this.rRootProbe.unmount();
    }
    if (this.con) {
      this.con.remove();
      this.conProbe.remove();
    }
  }

  public updateElPathKey(newElPath: ElPathKey) : void {
    this.elPathKey = newElPath;
  }
}
