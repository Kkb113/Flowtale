import { ScreenType } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import HighlighterBase, { HighlighterBaseConfig } from '../base/hightligher-base';
import { ROOT_EMBED_IFRAME_ID } from './preview';

export enum HighlightMode {
  Idle,
  Selection,
  Pinned,
  __NOOP__
}

type ElSelectCallback = (
  el: HTMLElement,
) => void;

type ElDeSelectCallback = (el: HTMLElement, doc: Document) => void;

export const SVG_EL = {
  a: 1,
  animate: 1,
  animateMotion: 1,
  animateTransform: 1,
  circle: 1,
  clipPath: 1,
  defs: 1,
  desc: 1,
  discard: 1,
  ellipse: 1,
  feBlend: 1,
  feColorMatrix: 1,
  feComponentTransfer: 1,
  feComposite: 1,
  feConvolveMatrix: 1,
  feDiffuseLighting: 1,
  feDisplacementMap: 1,
  feDropShadow: 1,
  feFlood: 1,
  feFuncA: 1,
  feFuncB: 1,
  feDistantLight: 1,
  feFuncG: 1,
  feFuncR: 1,
  feGaussianBlur: 1,
  feImage: 1,
  feMerge: 1,
  feMergeNode: 1,
  feMorphology: 1,
  feOffset: 1,
  fePointLight: 1,
  feSpecularLighting: 1,
  feSpotLight: 1,
  feTile: 1,
  feTurbulence: 1,
  filter: 1,
  foreignObject: 1,
  g: 1,
  hatch: 1,
  hatchpath: 1,
  image: 1,
  line: 1,
  linearGradient: 1,
  marker: 1,
  mask: 1,
  metadata: 1,
  mpath: 1,
  path: 1,
  pattern: 1,
  polygon: 1,
  polyline: 1,
  radialGradient: 1,
  rect: 1,
  script: 1,
  set: 1,
  stop: 1,
  style: 1,
  svg: 1,
  switch: 1,
  symbol: 1,
  text: 1,
  textPath: 1,
  title: 1,
  tspan: 1,
  use: 1,
  view: 1
};

export default class DomElementPicker extends HighlighterBase {
  protected highlightMode: HighlightMode;

  private prevElHovered: Element | Text | null;

  private onElSelect: ElSelectCallback;

  private onElDeSelect: ElDeSelectCallback;

  protected screenType: ScreenType;

  private evts: Partial<Record<keyof HTMLElementEventMap, Array<(doc: Document) => (e: Event) => void>>>;

  private selectedBoundedEl: HTMLElement | null | undefined;

  constructor(
    doc: Document,
    nestedFrames: HTMLIFrameElement[],
    cbs: { onElSelect: ElSelectCallback; onElDeSelect: ElDeSelectCallback,},
    screenType: ScreenType,
    config: HighlighterBaseConfig,
    isScreenHTML4: boolean,
  ) {
    super(doc, nestedFrames, config, isScreenHTML4);
    this.highlightMode = HighlightMode.Idle;
    this.maskEl = null;
    this.prevElHovered = null;
    this.onElSelect = cbs.onElSelect;
    this.onElDeSelect = cbs.onElDeSelect;
    this.screenType = screenType;
    this.evts = {};
    this.selectedBoundedEl = null;
  }

  enable(): DomElementPicker {
    if (this.highlightMode !== HighlightMode.Pinned) {
      this.highlightMode = HighlightMode.Selection;
    }
    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  maskHasDarkBg(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  highlightBgColor(): string {
    return `${this.config.selectionColor}25`;
  }

  disable(): DomElementPicker {
    if (this.highlightMode !== HighlightMode.Pinned) {
      this.highlightMode = HighlightMode.Idle;
      this.removeMaskIfPresent();
    }
    return this;
  }

  clearMask(withMode?: HighlightMode): DomElementPicker {
    if (withMode) this.highlightMode = withMode;
    this.removeMaskIfPresent();
    return this;
  }

  // stashCurrent -> only remove the selection from element visually
  // It's the responsibility of the caller module to restore the stash
  getOutOfPinMode(): DomElementPicker {
    this.highlightMode = HighlightMode.Selection;
    this.onElDeSelect(this.prevElHovered as HTMLElement, this.doc);
    this.removeMaskIfPresent();
    return this;
  }

  setSelectionMode() {
    this.highlightMode = HighlightMode.Selection;
  }

  addEventListener<K extends keyof DocumentEventMap>(
    eventName: K,
    fn: (doc: Document) => (e: DocumentEventMap[K]) => void
  ): void {
    let fns: Array<(doc: Document) => (e: DocumentEventMap[K]) => void> = [];
    if (eventName in this.evts) {
      fns = this.evts[eventName]!;
    } else {
      (this.evts as any)[eventName] = fns;
    }
    fns.push(fn);
    if (eventName !== 'click') {
      // we already install click listeners from this, hence outside clicks needs to be handled differently
      this.subscribeListenerToAllDoc(eventName, fn);
    }
  }

  getMode(): HighlightMode {
    return this.highlightMode;
  }

  setupHighlighting(): DomElementPicker {
    this.subscribeListenerToAllDoc('mousemove', this.handleMouseMove);
    this.subscribeListenerToAllDoc('mousedown', this.handleClick);

    return this;
  }

  dispose(): void {
    this.highlightMode = HighlightMode.Idle;
    this.evts = {};
    super.dispose();
  }

  // TODO If there are other html elements spanning over image element then we miss the image element, travarse the full
  // array returned by elementsFromPoint to checik if image element is in path.
  // Can be replicated using google analytics right top user icon click
  private getPrimaryFocusElementBelowMouse(
    els: HTMLElement[],
    x: number,
    y: number,
    doc: Document
  ): HTMLElement | Text {
    let i = 0;
    let svgEl: HTMLElement | null = null;
    for (const el of els) {
      if (el.tagName && el.tagName.toLowerCase() === 'svg') {
        svgEl = el;
      }
      i++;
      if (el.getAttribute('fable-ignr-sel')) {
        break;
      }
    }

    const elToBeReturned = els[i < els.length - 1 ? i : 0];

    if (elToBeReturned.tagName.toLowerCase() in SVG_EL) {
      if (svgEl) {
        return svgEl;
      }
    }

    const elBelowMouse = elToBeReturned as HTMLElement;
    const text = this.findTextDescendantsBelowMouse(elBelowMouse, x, y, doc);
    return text || elBelowMouse;
  }

  // eslint-disable-next-line class-methods-use-this
  private findTextDescendantsBelowMouse(el: HTMLElement, x: number, y: number, doc: Document): Text | null {
    const children = Array.from(el.childNodes);
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      // If there is only one child and the node is child node, then consider the whole node as text node.
      return children[0] as Text;
    }
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE || child instanceof Text) {
        const range = doc.createRange();
        range.selectNode(child);
        const rect = range.getBoundingClientRect();
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
          return child as Text;
        }
      }
    }
    return null;
  }

  private getAnchorElementFromShadowRoots = (
    doc: Document,
    clientX: number,
    clientY: number,
    element: HTMLElement
  ): HTMLElement => {
    if (!element.shadowRoot) return element;
    let el1 = element;
    const visitedNodes = new Set<Node>();

    while (el1.shadowRoot && !visitedNodes.has(el1)) {
      visitedNodes.add(el1);
      const els = el1.shadowRoot.elementsFromPoint(clientX, clientY) as HTMLElement[];

      if (!els.length) break;

      const el = this.getPrimaryFocusElementBelowMouse(els, clientX, clientY, doc);
      const anchorEl = (el.nodeType === Node.TEXT_NODE ? el.parentElement : el) as HTMLElement;

      el1 = anchorEl;
    }

    return el1;
  };

  private handleMouseMove = (doc: Document) => (event: MouseEvent) => {
    if (this.highlightMode !== HighlightMode.Selection) return;
    let els = doc.elementsFromPoint(event.clientX, event.clientY) as HTMLElement[];
    els.forEach(el => {
      if (el.shadowRoot) {
        els = el.shadowRoot.elementsFromPoint(event.clientX, event.clientY) as HTMLElement[];
      }
    });
    if (!els.length) return;
    const el = this.getPrimaryFocusElementBelowMouse(els, event.clientX, event.clientY, doc);
    let anchorEl = (el.nodeType === Node.TEXT_NODE ? (el.parentNode as HTMLElement) : el) as HTMLElement;
    if (anchorEl.shadowRoot) {
      anchorEl = this.getAnchorElementFromShadowRoots(doc, event.clientX, event.clientY, anchorEl);
    }
    if (this.prevElHovered && this.prevElHovered === anchorEl) return;
    this.prevElHovered = anchorEl;
    if (this.selectedBoundedEl) {
      if (this.selectedBoundedEl.contains(anchorEl)) {
        this.selectElementInDoc(anchorEl, doc);
      }
      return;
    }
    this.selectElementInDoc(anchorEl, doc);
  };

  isElInBoundedEl = (el: HTMLElement) : boolean => {
    if (this.selectedBoundedEl) {
      if (this.selectedBoundedEl.contains(el)) {
        return true;
      }
    }
    return false;
  };

  selectElementInDoc(el: HTMLElement, doc: Document, mode = HighlightMode.__NOOP__, ghost = false): void {
    !ghost && super.selectElementInDoc(el, doc);
    if (mode === HighlightMode.Pinned) {
      this.pinnedMode(el);
    }
  }

  selectElement(el: HTMLElement, mode = HighlightMode.__NOOP__, ghost = false): void {
    this.selectElementInDoc(el, el.ownerDocument, mode, ghost);
  }

  getParents(el: Node): Node[] {
    const res = [];
    let temp = el;
    while (true) {
      if (this.selectedBoundedEl && (temp === this.selectedBoundedEl)) {
        break;
      }
      if (temp.nodeName === '#document') {
        const tEl = temp as Document;
        if (tEl.defaultView
            && tEl.defaultView.frameElement
            && tEl.defaultView.frameElement.id === ROOT_EMBED_IFRAME_ID
        ) {
          break;
        } else {
          try {
            temp = tEl.defaultView!.frameElement!;
          } catch (e) {
            console.log('defaultView.frameElement must be present', tEl);
            raiseDeferredError(e as Error);
            break;
          }
        }
      }
      if (temp.nodeName === '#document-fragment') {
        temp = (temp as ShadowRoot).host;
      }
      res.push(temp);
      temp = temp.parentNode!;
    }
    return res.filter(e => {
      const box = (e as HTMLElement).getBoundingClientRect();
      return box.height !== 0 && box.width !== 0;
    }).reverse();
  }

  private pinnedMode(el: HTMLElement): void {
    this.highlightMode = HighlightMode.Pinned;
    this.onElSelect(el);
    this.setBodyCursor('auto');
  }

  createFullScreenMask(): void {
    const el = this.doc.querySelector('body');
    if (el) {
      this.highlightMode = HighlightMode.Pinned;
      super.createFullScreenMask();
    }
  }

  private handleClick = (doc: Document) => (e: MouseEvent) => {
    if (this.highlightMode === HighlightMode.Selection) {
      const el = this.prevElHovered;
      if (!el) {
        throw new Error("Can't pin an element as the previously hovered element is not found");
      }
      e.stopPropagation();
      e.preventDefault();
      this.pinnedMode(el as HTMLElement);
    } else {
      (this.evts.click || []).map(f => f(doc)(e));
    }
  };

  setSelectedBoundedEl(el: HTMLElement | null | undefined): void {
    this.selectedBoundedEl = el;
  }

  setBodyCursor(cursor: 'crosshair' | 'auto'): void {
    this.doc.body.style.cursor = cursor;
  }
}
