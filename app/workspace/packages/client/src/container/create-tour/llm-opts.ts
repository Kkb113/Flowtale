import { AiDxDy, InteractionCtx, RectWithFId } from '@fable/common/dist/types';
import { LLM_IMAGE_TYPE, LLM_MARK_COLORS } from './types';

// TODO
// 1. Run this code inside a worker thread
// 2. We might need ack (via message passing) to ensure worker thread is done

const OFFSET_BOX_BY_PX = 6;

function drawAdditionalRectsAndMarks(ctx: OffscreenCanvasRenderingContext2D, rects: RectWithFId[], boundary: {
  width: number;
  height: number;
}, dxdy: AiDxDy): void {
  const lineWidth = 2;
  rects.forEach((rect, i) => {
    const offset = OFFSET_BOX_BY_PX * (i + 2);
    // Calculate the x position of the rectangle, ensuring it doesn't go beyond the left boundary
    // Calculate the width of the rectangle, ensuring it doesn't exceed the right boundary
    // we only do this for width as websites normally won't have vertical scroll
    const x = Math.max(rect.x - offset + dxdy.dx, lineWidth);
    const w = Math.min(rect.width + offset * 2, boundary.width - lineWidth);
    const y = rect.y - offset + dxdy.dy;
    const h = rect.height + offset * 2;

    // If the boundbox of an element is greater than the current viewport ignore the mark
    // as it's rendered outside of viewport
    if (y < -OFFSET_BOX_BY_PX || y + h > boundary.height) return;

    ctx.beginPath();
    ctx.rect(x, y, w, h);

    // we do i+1 since we also have base color in LLM_MARK_COLORS, but it is not present in candidates
    ctx.strokeStyle = LLM_MARK_COLORS[i + 1];
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  });
}

function drawOverlayOnCanvas(ctx: OffscreenCanvasRenderingContext2D, {
  canvasWidth,
  canvasHeight,
  selectX,
  selectY,
  selectWidth,
  selectHeight,
}: {
  canvasWidth: number;
  canvasHeight: number;
  selectX: number;
  selectY: number;
  selectWidth: number;
  selectHeight: number;
}): void {
  // polygon1 -- clock wise movement to create the main rect
  ctx.moveTo(0, 0);
  ctx.lineTo(canvasWidth, 0);
  ctx.lineTo(canvasWidth, canvasHeight);
  ctx.lineTo(0, canvasHeight);
  ctx.lineTo(0, 0);
  ctx.closePath();

  // polygon2 --- counter clockwise movement to create the hole for overlay effect
  ctx.moveTo(selectX, selectY);
  ctx.lineTo(selectX, selectY + selectHeight);
  ctx.lineTo(selectX + selectWidth, selectY + selectHeight);
  ctx.lineTo(selectX + selectWidth, selectY);
  ctx.lineTo(selectX, selectY);
  ctx.closePath();

  ctx.fillStyle = 'rgba(1, 1, 1, 0.4)';
  ctx.strokeStyle = LLM_MARK_COLORS[0];
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
}

function renderMarks(ctx: OffscreenCanvasRenderingContext2D, marks: InteractionCtx, dxdy: AiDxDy): void {
  const { focusEl, candidates } = marks;
  drawOverlayOnCanvas(ctx, {
    canvasWidth: ctx.canvas.width,
    canvasHeight: ctx.canvas.height,
    selectX: focusEl.x - OFFSET_BOX_BY_PX + dxdy.dx,
    selectY: focusEl.y - OFFSET_BOX_BY_PX + dxdy.dy,
    selectWidth: focusEl.width + OFFSET_BOX_BY_PX * 2,
    selectHeight: focusEl.height + OFFSET_BOX_BY_PX * 2,
  });
  drawAdditionalRectsAndMarks(ctx, candidates.slice(1), {
    height: ctx.canvas.height,
    width: ctx.canvas.width
  }, dxdy);
}

async function loadImage(screenshotUrl: string): Promise<ImageBitmap> {
  const response = await fetch(screenshotUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

interface Rect {width: number, height: number}

function calculateDimensions(img: ImageBitmap, vpRect: Rect) :Rect {
  const aspectRatio = img.width / img.height;
  const maxWidth = vpRect.width;
  const maxHeight = maxWidth / aspectRatio;

  let w;
  let h;
  if (maxWidth / maxHeight > aspectRatio) {
    h = maxHeight;
    w = maxHeight * aspectRatio;
  } else {
    w = maxWidth;
    h = maxWidth / aspectRatio;
  }

  return { width: w, height: h };
}

export async function uploadScreenshotWithMark(
  vpRect: {
        height: number;
        width: number;
    },
  screenshotUrl: string,
  marks: InteractionCtx | null,
  dxdy: AiDxDy
): Promise<null | Blob> {
  try {
    const img = await loadImage(screenshotUrl);
    const { width: w, height: h } = calculateDimensions(img, vpRect);

    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext('2d');

    if (!ctx) {
      throw new Error('failed to get 2d context');
    }

    ctx.drawImage(img, 0, 0, w, h);
    if (!marks) {
      throw new Error('marks not found');
    }

    renderMarks(ctx, marks, dxdy);
    const blob = await offscreen.convertToBlob({ quality: 0.6, type: LLM_IMAGE_TYPE });
    return blob;
  } catch (error) {
    console.log(error);
    return null;
  }
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = async function (event) {
  if (event.data && event.data.sender === 'fable') {
    const res = await uploadScreenshotWithMark(event.data.frameRect, event.data.img, event.data.ctx, event.data.dxdy);
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ markImg: res, id: event.data.index, from: 'fable-worker', ctx: event.data.ctx });
  }
};

export {};
