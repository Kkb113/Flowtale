import { Coords, ITourDataOpts } from '@fable/common/dist/types';
import { ScreenType } from '@fable/common/dist/api-contract';
import { HighlighterBaseConfig } from '../base/hightligher-base';
import DomElementPicker, { HighlightMode } from './dom-element-picker';

type ElSelectCallback = (el: HTMLElement) => void;

type ElDeSelectCallback = (el: HTMLElement, doc: Document) => void;

type BoxSelectCallback = (coordsStr: string) => void;

type BoxDeSelectCallback = () => void;

type ImageBoxDrawingData = {
  coords: {
    startX: number,
    startY: number,
    endX: number,
    endY: number
  },
  scaleCoords: Coords,
  image: {
    width: number,
    height: number,
    top: number,
    left: number,
  },
  isDrawing: boolean
}

const defaultImageBoxDrawingData: ImageBoxDrawingData = {
  coords: {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  },
  scaleCoords: {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  },
  image: {
    width: 0,
    height: 0,
    top: 0,
    left: 0,
  },
  isDrawing: false,
};

export default class ScreenImageBrusher extends DomElementPicker {
  private onBoxSelect: BoxSelectCallback;

  private onBoxDeSelect: BoxDeSelectCallback;

  private imageBoxDrawingData: ImageBoxDrawingData;

  private imageEl : HTMLImageElement;

  constructor(
    doc: Document,
    nestedFrames: HTMLIFrameElement[],
    cbs: {
        onElSelect: ElSelectCallback,
        onElDeSelect: ElDeSelectCallback,
        onBoxSelect: BoxSelectCallback,
        onBoxDeSelect: BoxDeSelectCallback
    },
    screenType: ScreenType,
    config: HighlighterBaseConfig,
    isScreenHTML4: boolean,
  ) {
    super(doc, nestedFrames, cbs, screenType, config, isScreenHTML4);
    this.maskEl = null;
    this.onBoxSelect = cbs.onBoxSelect;
    this.onBoxDeSelect = cbs.onBoxDeSelect;
    this.screenType = screenType;
    this.imageBoxDrawingData = { ...defaultImageBoxDrawingData };

    this.imageEl = this.doc.querySelector('img')!;

    const { top, left, width, height } = this.imageEl.getBoundingClientRect();
    this.imageBoxDrawingData.image = {
      top,
      left,
      width,
      height,
    };
  }

  setSelectionMode() {
    this.highlightMode = HighlightMode.Selection;
    this.setBodyCursor('crosshair');
  }

  getOutOfPinMode() {
    this.highlightMode = HighlightMode.Selection;
    this.setBodyCursor('crosshair');
    this.onBoxDeSelect();
    this.removeMaskIfPresent();
    return this;
  }

  setupHighlighting() {
    this.imageEl.addEventListener('click', (e) => {
      e.preventDefault();
    });

    // start drawing
    this.imageEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (this.highlightMode !== HighlightMode.Selection) return;
      if (this.imageBoxDrawingData.isDrawing) return;
      const { top, left, width, height } = this.imageEl.getBoundingClientRect();
      this.imageBoxDrawingData.image = {
        top,
        left,
        width,
        height,
      };
      this.startDrawingBox(e);
    });

    // update drawing
    this.imageEl.addEventListener('mousemove', (e) => {
      e.preventDefault();
      if (this.highlightMode !== HighlightMode.Selection) return;
      if (!this.imageBoxDrawingData.isDrawing) return;

      this.updateDrawingBox(e);
    });

    // stop drawing
    this.imageEl.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (this.highlightMode !== HighlightMode.Selection) {
        this.getOutOfPinMode();
        return;
      }
      if (!this.imageBoxDrawingData.isDrawing) return;
      this.stopDrawingBox(e);
      this.highlightMode = HighlightMode.Pinned;
      this.setBodyCursor('auto');
    });

    return this;
  }

  selectBoxInDoc(scaleCoords: Coords): void {
    super.selectBoxInDoc(scaleCoords);
    this.highlightMode = HighlightMode.Pinned;
    this.setBodyCursor('auto');
  }

  private startDrawingBox(e: MouseEvent) {
    this.imageBoxDrawingData.coords.startX = e.pageX - (e.currentTarget as HTMLImageElement).offsetLeft;
    this.imageBoxDrawingData.coords.startY = e.pageY - (e.currentTarget as HTMLImageElement).offsetTop;
    this.imageBoxDrawingData.isDrawing = true;

    this.updateDrawingBox(e);

    return this;
  }

  private updateDrawingBox(e: MouseEvent) {
    this.imageBoxDrawingData.coords.endX = e.pageX - (e.currentTarget as HTMLImageElement).offsetLeft;
    this.imageBoxDrawingData.coords.endY = e.pageY - (e.currentTarget as HTMLImageElement).offsetTop;

    const { startX, startY, endX, endY } = this.imageBoxDrawingData.coords;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(startX - endX);
    const height = Math.abs(startY - endY);

    const relCoords = this.getRelFromAbsCoords({ x, y, width, height });

    this.imageBoxDrawingData.scaleCoords = { ...relCoords };

    super.selectBoxInDoc(relCoords);

    return this;
  }

  private stopDrawingBox(e: MouseEvent) {
    this.imageBoxDrawingData.isDrawing = false;

    const { x, y, width, height } = this.imageBoxDrawingData.scaleCoords;
    const coordsStr = `${x}-${y}-${width}-${height}`;

    this.onBoxSelect(coordsStr);

    return this;
  }

  private getRelFromAbsCoords(coords: Coords) {
    const { x, y, width, height } = coords;
    const { width: imgWidth, height: imgHeight } = this.imageBoxDrawingData.image;
    return {
      x: x / imgWidth,
      y: y / imgHeight,
      width: width / imgWidth,
      height: height / imgHeight
    };
  }

  dispose() {
    this.highlightMode = HighlightMode.Idle;
    this.setBodyCursor('auto');
    super.dispose();
  }
}
