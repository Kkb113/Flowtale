import createDOMPurify from 'dompurify';

// Separate instance: hooks for annotation HTML must never relax captured-document sanitization.
const purifier = createDOMPurify(window);
const styleProperties = new Set([
  'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style',
  'text-decoration', 'text-align', 'line-height', 'letter-spacing', 'white-space',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'width', 'height', 'max-width', 'max-height', 'object-fit', 'display',
  'border', 'border-color', 'border-width', 'border-style', 'border-radius',
  'list-style-type', 'vertical-align',
]);

export function isSupportedVideoEmbed(source: string): boolean {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    return (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)
        && /^\/embed\/[\w-]{11}$/.test(url.pathname))
      || (url.hostname === 'www.loom.com' && /^\/embed\/[a-zA-Z0-9-]{1,64}$/.test(url.pathname))
      || (url.hostname === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname));
  } catch { return false; }
}

purifier.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe' && !isSupportedVideoEmbed((node as Element).getAttribute('src') || '')) {
    node.parentNode?.removeChild(node);
  }
});
purifier.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName !== 'style') return;
  const style = document.createElement('span').style;
  style.cssText = data.attrValue;
  for (const property of Array.from(style)) {
    const value = style.getPropertyValue(property);
    if (!styleProperties.has(property) || /url\s*\(|var\s*\(|expression\s*\(|\\/i.test(value)) {
      style.removeProperty(property);
    }
  }
  data.attrValue = style.cssText;
  data.keepAttr = data.attrValue.length > 0;
});
purifier.addHook('afterSanitizeAttributes', node => {
  const element = node as Element;
  if (element.tagName === 'A') {
    element.setAttribute('rel', 'noopener noreferrer');
    if (element.getAttribute('target') !== '_self') element.setAttribute('target', '_blank');
  }
  if (element.tagName === 'IFRAME') {
    element.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    element.setAttribute('referrerpolicy', 'no-referrer');
    element.setAttribute('allow', 'fullscreen; picture-in-picture');
    element.setAttribute('title', 'Embedded video');
  }
});

export function sanitizeRichText(html: string): string {
  return purifier.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'target', 'fable-input-field-uid', 'fable-x-f-vfn', 'fable-validation-uid',
      'fable-input-uid', 'fable-lead-form-field-name',
    ],
    FORBID_TAGS: ['style', 'form', 'link', 'meta', 'base', 'object', 'embed'],
    FORBID_ATTR: ['srcdoc', 'action', 'formaction', 'autofocus', 'is'],
  });
}

export function richTextToPlainText(html: string): string {
  // Never attach untrusted markup to the live document just to obtain innerText.
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichText(html);
  template.content.querySelectorAll('br, p, div, li, h1, h2, h3, h4, h5, h6').forEach(element => {
    element.appendChild(document.createTextNode('\n'));
  });
  return (template.content.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
