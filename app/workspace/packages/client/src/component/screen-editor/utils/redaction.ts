import { SerNode } from '@fable/common/dist/types';
import { proxyAssetKey } from './private-capture-assets';

export type RedactionRect = { width: number; height: number; assetKeys?: string[]; inlineImages?: string[] };

export function measureRedaction(element: HTMLElement): RedactionRect {
  const retained = originals.get(element)?.measurement;
  if (retained) return retained;
  const { width, height } = element.getBoundingClientRect();
  const assetKeys = new Set<string>();
  const inlineImages = new Set<string>();
  const inspect = (value: string): void => {
    for (const match of Array.from(value.matchAll(/data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=]+/g))) inlineImages.add(match[0]);
    for (const match of Array.from(value.matchAll(/(?:https?:\/\/|blob:)[^\s"'<>),;]+/g))) {
      const key = proxyAssetKey(match[0]);
      if (key) assetKeys.add(key);
    }
  };
  const visit = (root: Element): void => {
    for (const attr of Array.from(root.attributes)) inspect(attr.value);
    const view = root.ownerDocument.defaultView;
    if (view) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = view.getComputedStyle(root, pseudo);
        for (const property of ['background-image', 'border-image-source', 'mask-image', 'list-style-image', 'content']) {
          inspect(style.getPropertyValue(property));
        }
      }
    }
    for (const child of Array.from(root.children)) visit(child);
    if (root.shadowRoot) for (const child of Array.from(root.shadowRoot.children)) visit(child);
    if (root.tagName === 'IFRAME') {
      const child = (root as HTMLIFrameElement).contentDocument?.documentElement;
      if (child) visit(child);
    }
  };
  visit(element);
  return { width, height, assetKeys: Array.from(assetKeys), inlineImages: Array.from(inlineImages) };
}

/** Keep only the replacement image, never the captured element's inherited CSS. */
export function maskAppearance(style: string): string {
  const declarations = Array.from(style.matchAll(/background-image\s*:\s*((?:url\([^)]*\)|[^;])*)/gi));
  const images = Array.from((declarations.pop()?.[1] || '').matchAll(/url\(\s*['"]?(https?:\/\/[^'"\s()]+|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)['"]?\s*\)/gi));
  const image = images.pop()?.[1];
  let appearance = image ? `background-image:url("${image}")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:cover!important;` : '';
  for (const dimension of ['width', 'height']) {
    const values = Array.from(style.matchAll(new RegExp(`(?:^|;)\\s*${dimension}\\s*:\\s*(\\d+(?:\\.\\d+)?)px(?:\\s*!important)?\\s*(?=;|$)`, 'gi')));
    const value = values.pop()?.[1];
    if (value !== undefined) appearance += `${dimension}:${value}px!important;`;
  }
  return appearance;
}

export function redactionStyle(rect?: RedactionRect, hidden = false): string {
  let style = `display:${hidden ? 'none' : 'inline-block'}!important;background:#334155!important;`
    + 'color:transparent!important;border:0!important;box-sizing:border-box!important;'
    + 'min-width:1em;min-height:1em;overflow:hidden!important;';
  if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width >= 0 && rect.height >= 0) {
    style += `width:${rect.width}px;height:${rect.height}px;`;
  }
  return style;
}

export function redactSerializedNode(node: SerNode, rect = node.props.rect, hidden = false, maskStyle = ''): void {
  const fid = node.attrs['f-id'];
  const name = ['html', 'head', 'body'].includes(node.name) ? node.name : 'span';
  Object.keys(node).forEach(key => delete (node as any)[key]);
  Object.assign(node, { type: 1,
    name,
    sv: 2,
    attrs: { style: redactionStyle(rect, hidden) + maskAppearance(maskStyle),
      'aria-label': 'Redacted content',
      'data-fable-redacted': 'true',
      ...(fid ? { 'f-id': fid } : {}) },
    props: { proxyUrlMap: {} },
    chldrn: [] });
}

const originals = new WeakMap<HTMLElement, { attributes: [string, string][]; children: ChildNode[]; value?: string; measurement: RedactionRect }>();

/** Live authoring keeps its original node privately so toggling off is lossless. */
export function setElementRedacted(element: HTMLElement, enabled: boolean, maskStyle = ''): RedactionRect {
  const { width, height } = element.getBoundingClientRect();
  if (!enabled) {
    const original = originals.get(element);
    if (original) {
      Array.from(element.attributes).forEach(attr => element.removeAttribute(attr.name));
      original.attributes.forEach(([name, value]) => element.setAttribute(name, value));
      element.replaceChildren(...original.children);
      if (original.value !== undefined) (element as HTMLInputElement).value = original.value;
      originals.delete(element);
    }
    return { width, height };
  }
  const measurement = measureRedaction(element);
  if (!originals.has(element)) {
    originals.set(element, {
      measurement,
      attributes: Array.from(element.attributes).map(attr => [attr.name, attr.value]),
      children: Array.from(element.childNodes),
      ...('value' in element ? { value: (element as HTMLInputElement).value } : {}),
    });
  }
  element.replaceChildren();
  for (const name of ['src', 'srcset', 'srcdoc', 'value', 'placeholder', 'title', 'alt', 'poster']) element.removeAttribute(name);
  if ('value' in element) (element as HTMLInputElement).value = '';
  // A replaced image still needs a valid, empty source to avoid a broken-image glyph.
  if (element.tagName === 'IMG') element.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
  element.setAttribute('style', redactionStyle({ width, height }) + maskAppearance(maskStyle));
  element.setAttribute('aria-label', 'Redacted content');
  element.dataset.fableRedacted = 'true';
  element.dataset.fableRedactionKind = maskStyle ? 'mask' : 'blur';
  return measurement;
}

export function applyPendingRedactions(root: Document | ShadowRoot): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const element of elements) {
    if (element.shadowRoot) applyPendingRedactions(element.shadowRoot);
    if (element.tagName === 'IFRAME') {
      const doc = (element as HTMLIFrameElement).contentDocument;
      if (doc) applyPendingRedactions(doc);
    }
  }
  for (const element of elements) {
    if (element.hasAttribute('data-fable-pending-redaction')) {
      const maskStyle = element.getAttribute('data-fable-pending-mask') || '';
      element.removeAttribute('data-fable-pending-redaction');
      element.removeAttribute('data-fable-pending-mask');
      setElementRedacted(element, true, maskStyle);
    }
  }
}
