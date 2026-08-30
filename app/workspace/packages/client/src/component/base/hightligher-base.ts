import { Coords } from '@fable/common/dist/types';
import { ROOT_EMBED_IFRAME_ID } from '../screen-editor/preview';
import { getFableRtUmbrlDiv } from '../annotation/utils';

export interface Rect {
  x: number;
  y: number;
  height: number;
  width: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface HighlighterBaseConfig {
  selectionColor: string;
  showOverlay: boolean;
  showMaskBorder : boolean;
}

export default abstract class HighlighterBase {
  protected readonly doc: Document;

  protected readonly win: Window;

  protected maskEl: HTMLDivElement | null;

  static ANNOTATION_PADDING_ONE_SIDE = 8;

  nestedFrames: HTMLIFrameElement[] = [];

  nestedDocs: Document[] = [];

  private listnrSubs: Partial<Record<keyof HTMLElementEventMap, Array<[(e: Event) => void, Document]>>>;

  protected config: HighlighterBaseConfig;

  protected isScreenHTML4: boolean;

  constructor(doc: Document, nestedFrames: HTMLIFrameElement[], config: HighlighterBaseConfig, isScreenHTML4: boolean) {
    this.doc = doc;
    this.setNestedFrames(nestedFrames);
    this.win = doc.defaultView as Window;
    this.maskEl = null;
    this.listnrSubs = {};
    this.config = config;
    this.isScreenHTML4 = isScreenHTML4;
  }

  setNestedFrames(nestedFrames: HTMLIFrameElement[]): void {
    this.nestedFrames = nestedFrames.filter(frame => !!frame.contentDocument);
    this.nestedDocs = this.nestedFrames.map(f => f.contentDocument).filter(d => !!d) as Document[];
  }

  protected dispose(): void {
    for (const [key, unsubs] of Object.entries(this.listnrSubs)) {
      const tKey = key as keyof HTMLElementEventMap;
      unsubs.forEach(([fn, doc]) => doc.removeEventListener(tKey, fn, key === 'scroll'));
    }
    this.listnrSubs = {};
    this.removeMaskIfPresent();
  }

  // WARN this does not work for elements that are visible but height is greater than the
  // window height or width is greater than the window width
  protected isElInViewPort(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();

    return (
      rect.top >= 0
      && rect.left >= 0
      && rect.bottom <= (this.win.innerHeight || this.doc.documentElement.clientHeight)
      && rect.right <= (this.win.innerWidth || this.doc.documentElement.clientWidth)
    );
  }

  private drawMask(elSize: Rect, win: Window, dx: number, dy: number, elBorderRadius: string): void {
    const maskBox = this.getOrCreateMask();

    const { top, left, width, height } = HighlighterBase.getMaskBoxRect(elSize, win, dx, dy, this.isScreenHTML4);

    maskBox.style.top = `${top}px`;
    maskBox.style.left = `${left}px`;
    maskBox.style.width = `${width}px`;
    maskBox.style.height = `${height}px`;
    maskBox.style.borderRadius = elBorderRadius;
  }

  static getMaskBoxRect(elSize: Rect, win: Window, dx: number, dy: number, isScreenHTML4: boolean): Rect {
    const padding = HighlighterBase.ANNOTATION_PADDING_ONE_SIDE;
    const body = win.document.body;

    const bodyScrollTopAdjustment = isScreenHTML4 ? 0 : body.scrollTop;
    const bodyScrollLeftAdjustment = isScreenHTML4 ? 0 : body.scrollLeft;

    const top = elSize.top + win.scrollY + dy + bodyScrollTopAdjustment;
    const left = elSize.left + win.scrollX + dx + bodyScrollLeftAdjustment;

    const rightEndpoint = Math.ceil(left + elSize.width + (left <= 0 ? 0 : padding * 2));
    // the boundary is checked against the main window not iframe's window
    // as iframe could occupy a small portion in screen.
    const width = rightEndpoint >= win.scrollX + window.innerWidth
      ? elSize.width : elSize.width + (left <= 0 ? 0 : padding * 2);

    const bottomEndpoint = Math.ceil(top + elSize.height + (top <= 0 ? 0 : padding * 2));
    const height = bottomEndpoint >= win.scrollY + window.innerHeight
      ? elSize.height : elSize.height + (top <= 0 ? 0 : padding * 2);

    const maskBoxTop = bottomEndpoint >= win.scrollY + window.innerHeight ? top : top - (top <= 0 ? -2 : padding);
    const maskBoxLeft = rightEndpoint >= win.scrollX + window.innerWidth ? left : left - (left <= 0 ? -2 : padding);

    return {
      top: maskBoxTop,
      left: maskBoxLeft,
      width,
      height,
      bottom: maskBoxTop + height,
      right: maskBoxLeft + width,
      x: maskBoxLeft,
      y: maskBoxTop
    };
  }

  static getMaskPaddingWithBox(elBox: Rect, maskBox: Rect): {
    left: number,
    right: number,
    top: number,
    bottom: number,
  } {
    return {
      left: elBox.left - maskBox.left,
      right: maskBox.right - elBox.right,
      top: elBox.top - maskBox.top,
      bottom: maskBox.bottom - elBox.bottom
    };
  }

  static getCumulativeDxDy(win: Window): [dx: number, dy: number] {
    const doc = win.document;
    const cdxdy = doc.body.getAttribute('cdxdy');
    const [cdx, cdy] = (cdxdy || ',').split(',').map(d => +d);
    return [cdx, cdy];
  }

  // We used to calculate dxdy of frames after loading complete
  // Sometime (google sheet extension) even ater the onload event iframe content's gets repostioned after that
  // (probably css?) Hence we calculate dxdy on first interaction itself
  private calculateCumulativeDxdy(doc: Document, cdxdy: [number, number] = [0, 0]): [number, number] {
    let dxdy = doc.body.getAttribute('dxdy');
    if (!dxdy) {
      if (doc.defaultView && doc.defaultView.frameElement) {
        const box = doc.defaultView.frameElement.getBoundingClientRect();
        dxdy = `${box.x},${box.y}`;
        doc.body.setAttribute('dxdy', dxdy);
      }
    }
    const [dx, dy] = (dxdy || ',').split(',').map(d => +d);
    if (doc.defaultView && doc.defaultView.frameElement && doc.defaultView.frameElement.id !== ROOT_EMBED_IFRAME_ID) {
      return this.calculateCumulativeDxdy(doc.defaultView.frameElement.ownerDocument, [cdxdy[0] + dx, cdxdy[1] + dy]);
    }
    return cdxdy;
  }

  protected getCumulativeDxdy(doc: Document): [number, number] {
    let val;
    if (val = doc.body.getAttribute('cdxdy')) {
      return val.split(',').map(d => +d) as [number, number];
    }
    const calculatedVal = this.calculateCumulativeDxdy(doc);
    doc.body.setAttribute('cdxdy', calculatedVal.join(','));
    return calculatedVal;
  }

  protected selectElementInDoc(el: HTMLElement, doc: Document): void {
    const win = doc.defaultView!;
    const [dx, dy] = this.getCumulativeDxdy(el.ownerDocument);
    const elSize: DOMRect = el.getBoundingClientRect();
    const elBorderRadius = getComputedStyle(el).borderRadius;
    this.drawMask(elSize, this.win, dx, dy, elBorderRadius === '0px' ? '2px' : elBorderRadius);
  }

  selectBoxInDoc(scaleCoords: Coords): void {
    const win = this.doc.defaultView!;
    const [dx, dy] = this.doc.body.getAttribute('dxdy')!.split(',').map(d => +d);
    const elSize = this.getAbsFromRelCoords(scaleCoords);
    this.drawMask(elSize, win, dx, dy, '2px');
  }

  getAbsFromRelCoords(coords: Coords): Rect {
    const imageEl = this.doc.querySelector('img')!;
    const imageRect = imageEl.getBoundingClientRect();

    const x = Math.round(coords.x * imageRect.width);
    const y = Math.round(coords.y * imageRect.height);
    const width = Math.round(coords.width * imageRect.width);
    const height = Math.round(coords.height * imageRect.height);

    const top = imageRect.top + y;
    const left = imageRect.left + x;
    const right = left + width;
    const bottom = top + height;

    return {
      x, y, width, height, top, left, right, bottom
    };
  }

  createFullScreenMask(): void {
    const elSize: DOMRect = this.doc.body.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();
    maskBox.style.top = `${elSize.top + this.win.scrollY}px`;
    maskBox.style.left = `${elSize.left + this.win.scrollX}px`;
    maskBox.style.width = '0px';
    maskBox.style.height = '0px';
  }

  abstract maskHasDarkBg(): boolean;

  abstract highlightBgColor(): string;

  protected getOrCreateMask(): HTMLDivElement {
    if (this.maskEl) {
      return this.maskEl;
    }

    return this.createMask();
  }

  protected createMask(): HTMLDivElement {
    const cls = `fable-el-mask-${(Math.random() * 10 ** 6) | 0}`;

    const mask = this.doc.createElement('div');
    mask.setAttribute('class', cls);
    mask.style.position = 'absolute';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    mask.style.background = this.highlightBgColor();
    mask.style.borderRadius = '2px';
    mask.style.transition = 'box-shadow 0.2s ease-out';
    this.maskEl = mask;
    this.updateMask();
    this.attachElToUmbrellaDiv(mask);
    return mask;
  }

  updateMask(): void {
    if (!this.maskEl) return;

    let selectionColor = this.config.selectionColor;
    if (selectionColor !== 'transparent') {
      selectionColor = `${selectionColor}${this.config.showMaskBorder ? 'ff' : '00'}`;
    }

    this.maskEl.style.boxShadow = `${selectionColor} 0px 0px 0px 2px, rgba(0, 0, 0, ${(this.maskHasDarkBg() && this.config.showOverlay) ? '0.3' : '0.0'
    }) 0px 0px 0px 1000vw`;
  }

  protected subscribeListenerToAllDoc<K extends keyof DocumentEventMap>(
    evt: K,
    fn: (doc: Document) => (e: DocumentEventMap[K]) => void
  ): void {
    (this.listnrSubs as any)[evt] = [
      ...((this.listnrSubs as any)[evt] || []),
      ...[this.doc, ...this.nestedDocs].map(doc => {
        const evtFn = fn(doc);
        doc.addEventListener(evt, evtFn, evt === 'scroll');
        return [evtFn, doc];
      })
    ];
  }

  updateConfig<K extends keyof HighlighterBaseConfig>(key: K, value: HighlighterBaseConfig[K]): void {
    if (value !== this.config[key]) {
      this.config[key] = value;
      this.updateMask();
    }
  }

  protected attachElToUmbrellaDiv(el: Element) {
    const umbrellaDiv = getFableRtUmbrlDiv(this.doc);
    if (!umbrellaDiv) {
      throw new Error('Container div not found');
    }
    const annotationsContainer = umbrellaDiv.querySelector('.fable-annotations--container');

    umbrellaDiv.insertBefore(el, annotationsContainer);
    return this;
  }

  protected removeMaskIfPresent(): void {
    if (this.maskEl) {
      this.maskEl.remove();
      this.maskEl = null;
    }
  }

  getDoc(): Document {
    return this.doc as Document;
  }

  elFromPath(path: string): HTMLElement | null {
    if (path === '1') return this.doc.body;

    const el = this.calcElFromPath(path);

    if (el?.nodeName.toLowerCase() === 'html') {
      return el.ownerDocument.body || el.parentElement;
    }

    return el;
  }

  calcElFromPath(path: string): HTMLElement | null {
    const elIdxs = path.split('.').map((id) => +id).slice(1);
    const document = this.doc as Document;
    let node = document.documentElement as Node;

    if (path === '1') {
      return node as HTMLElement;
    }

    let p = '';
    for (const id of elIdxs) {
      p += `.${id}`;
      if ((node as HTMLElement).tagName && ((node as HTMLElement).tagName.toLowerCase() === 'iframe'
        || (node as HTMLElement).tagName.toLowerCase() === 'object')) {
        node = (node as HTMLIFrameElement).contentDocument!;
      }
      const childNodes: Array<ChildNode | ShadowRoot> = Array.from(node.childNodes);
      if ((node as HTMLElement).shadowRoot) {
        childNodes.unshift((node as HTMLElement).shadowRoot!);
      }
      if (node.nodeType === Node.DOCUMENT_NODE) {
        node = (node as Document).documentElement;
      } else {
        node = childNodes[id];
      }
    }
    if (node === this.doc) {
      return null;
    }
    return node as HTMLElement;
  }

  // eslint-disable-next-line class-methods-use-this
  elPath(el: HTMLElement) {
    let elPath = el.getAttribute('fab-el-path');
    if (elPath === null) {
      const path = HighlighterBase.calculatePathFromEl(el, []);
      elPath = path.join('.');
      el.setAttribute('fab-el-path', elPath);
    }
    return elPath;
  }

  private static calculatePathFromEl(el: Node, loc: number[]): number[] {
    if (el.nodeName === '#document') {
      const tEl = el as Document;
      if (tEl.defaultView && tEl.defaultView.frameElement && tEl.defaultView.frameElement.id !== ROOT_EMBED_IFRAME_ID) {
        return this.calculatePathFromEl(tEl.defaultView.frameElement, loc);
      }
      return loc.reverse();
    }
    let parent = el.parentNode;
    const siblings : (ChildNode | ShadowRoot)[] = Array.from(parent!.childNodes);
    if ((parent as HTMLElement).shadowRoot) {
      siblings.unshift((parent as HTMLElement).shadowRoot!);
    }

    for (let i = 0, l = siblings.length; i < l; i++) {
      if (el === siblings[i]) {
        loc.push(i);
        if (parent!.nodeName === '#document-fragment') {
          parent = (parent as ShadowRoot).host;
          loc.push(0);
          return this.calculatePathFromEl(parent!, loc);
        }
        return this.calculatePathFromEl(el.parentNode!, loc);
      }
    }
    return loc;
  }
}
