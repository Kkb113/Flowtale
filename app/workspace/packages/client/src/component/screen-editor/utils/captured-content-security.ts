import createDOMPurify from 'dompurify';

export const CAPTURE_SANDBOX = 'allow-same-origin';
const blockedElements = new Set(['script', 'noscript', 'base', 'meta', 'embed', 'applet', 'animate', 'set']);

export function isBlockedCaptureElement(name: string): boolean {
  return blockedElements.has(name.toLowerCase());
}

export function isSafeCaptureAttribute(tagName: string, name: string, value: string): boolean {
  const tag = tagName.toLowerCase();
  const attr = name.toLowerCase();
  if (/^on/i.test(attr) || ['is', 'autofocus', 'action', 'formaction', 'ping', 'nonce'].includes(attr)) return false;
  if (tag === 'iframe' && ['allow', 'allowfullscreen'].includes(attr)) return false;
  if (['href', 'xlink:href', 'src', 'poster', 'background', 'data'].includes(attr)) {
    // Browsers ignore ASCII controls in URL schemes; validate the normalized value.
    // eslint-disable-next-line no-control-regex
    const normalized = value.replace(/[\u0000-\u0020\u007f]/g, '');
    if (/^(javascript|vbscript|file):/i.test(normalized)) return false;
    if (/^data:/i.test(normalized) && !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(normalized)) {
      return false;
    }
  }
  return true;
}

export function applyCapturedInputState(element: Element, state: Record<string, unknown>): void {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (typeof state.type === 'string') input.type = state.type;
    if (typeof state.checked === 'boolean') input.checked = state.checked;
    if (typeof state.value === 'string') {
      input.value = ['file', 'password'].includes(input.type) ? '' : state.value;
    }
  } else if (tag === 'select' && typeof state.value === 'string') {
    (element as HTMLSelectElement).value = state.value;
  }
}

export function sanitizeCapturedHtml(html: string, depth = 0): string {
  if (depth > 8 || html.length > 5 * 1024 * 1024) {
    throw new Error('Captured frame exceeds the supported nesting or content limit. Recapture this screen.');
  }
  // Each recursion owns its hooks/configuration; DOMPurify instances are not re-entrant.
  const purifier = createDOMPurify(window);
  purifier.addHook('uponSanitizeAttribute', (node, data) => {
    if (!isSafeCaptureAttribute((node as Element).tagName || '', data.attrName, data.attrValue)) {
      data.keepAttr = false;
    }
    if ((node as Element).tagName === 'IFRAME' && data.attrName === 'src') data.keepAttr = false;
    if (data.attrName === 'srcdoc') data.attrValue = sanitizeCapturedHtml(data.attrValue, depth + 1);
  });
  purifier.addHook('afterSanitizeAttributes', node => {
    if ((node as Element).tagName === 'IFRAME') {
      (node as Element).setAttribute('sandbox', CAPTURE_SANDBOX);
      (node as Element).setAttribute('referrerpolicy', 'no-referrer');
    }
  });
  return purifier.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['iframe', 'link'],
    ADD_ATTR: ['srcdoc', 'f-id'],
    FORBID_TAGS: [...Array.from(blockedElements), 'object'],
    FORBID_ATTR: ['allow', 'is', 'autofocus'],
  });
}

export function sanitizeCapturedSvg(svg: string): string {
  const purifier = createDOMPurify(window);
  // External <use> references can import unsanitized SVG. Captured sprites use local IDs only.
  purifier.addHook('uponSanitizeAttribute', (node, data) => {
    if ((node as Element).tagName.toLowerCase() === 'use' && ['href', 'xlink:href'].includes(data.attrName)
      && !/^#[^\s<>]+$/.test(data.attrValue)) data.keepAttr = false;
  });
  return purifier.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
    ADD_ATTR: ['f-id'],
    FORBID_TAGS: [...Array.from(blockedElements), 'foreignObject'],
  });
}
