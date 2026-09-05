import { SerNode } from '@fable/common/dist/types';
import { applyPendingRedactions, maskAppearance, redactSerializedNode, setElementRedacted } from './redaction';

const computedStyle = window.getComputedStyle;
beforeEach(() => {
  // jsdom has no pseudo-element layout; browser coverage exercises that rendering path.
  jest.spyOn(window, 'getComputedStyle').mockImplementation(element => computedStyle.call(window, element));
});
afterEach(() => jest.restoreAllMocks());

it('removes private serialized content and attributes while retaining its target and dimensions', () => {
  const node: SerNode = { type: 1,
    name: 'input',
    sv: 2,
    attrs: { 'f-id': 'fixture', value: 'PRIVATE', title: 'PRIVATE' },
    props: { proxyUrlMap: {}, nodeProps: { value: 'PRIVATE' }, rect: { width: 220, height: 60 } },
    chldrn: [{ type: 3, name: '#text', sv: 2, attrs: {}, props: { proxyUrlMap: {}, textContent: 'PRIVATE' }, chldrn: [] }] };
  redactSerializedNode(node);
  expect(JSON.stringify(node)).not.toContain('PRIVATE');
  expect(node.attrs['f-id']).toBe('fixture');
  expect(node.attrs.style).toContain('width:220px;height:60px;');
  expect(node.chldrn).toEqual([]);
});

it('restores original authoring nodes and attributes when redaction is toggled off', () => {
  const element = document.createElement('div');
  element.setAttribute('title', 'Private title');
  element.innerHTML = '<input value="Private input"><span>Private text</span>';
  const input = element.querySelector('input')!;
  input.value = 'Unsaved live input';
  const before = element.outerHTML;
  element.getBoundingClientRect = () => ({ width: 200, height: 50 } as DOMRect);
  expect(setElementRedacted(element, true)).toEqual({ width: 200, height: 50, assetKeys: [], inlineImages: [] });
  expect(element.textContent).toBe('');
  expect(element.style.backgroundColor).toBe('rgb(51, 65, 85)');
  setElementRedacted(element, false);
  expect(element.outerHTML).toBe(before);
  expect(element.querySelector('input')).toBe(input);
  expect(input.value).toBe('Unsaved live input');
});

it('initializes reload redactions inside captured shadow roots with reversible private state', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<div data-fable-pending-redaction="true">Private text</div>';
  const element = shadow.querySelector('div')!;
  applyPendingRedactions(document);
  expect(element.dataset.fableRedacted).toBe('true');
  expect(element.textContent).toBe('');
  setElementRedacted(element, false);
  expect(element.textContent).toBe('Private text');
  host.remove();
});

it.each(['input', 'textarea'])('clears live %s values and restores unsaved authoring state', tag => {
  const element = document.createElement(tag) as HTMLInputElement;
  element.setAttribute('value', 'Saved private value');
  element.value = 'Unsaved private value';
  setElementRedacted(element, true);
  expect(element.value).toBe('');
  expect(element.outerHTML).not.toContain('private value');
  setElementRedacted(element, false);
  expect(element.getAttribute('value')).toBe('Saved private value');
  expect(element.value).toBe('Unsaved private value');
});

it('uses an empty image while redacted and restores the original image sources', () => {
  const element = document.createElement('img');
  element.src = 'https://example.com/private.png';
  element.srcset = 'https://example.com/private-large.png 2x';
  setElementRedacted(element, true);
  expect(element.src).toMatch(/^data:image\/gif;/);
  expect(element.srcset).toBe('');
  setElementRedacted(element, false);
  expect(element.src).toBe('https://example.com/private.png');
  expect(element.srcset).toContain('private-large.png');
});

it('retains only the final replacement mask image and dimensions, excluding inherited content', () => {
  const style = 'background-image:url(https://example.com/private.png);content:"PRIVATE";'
    + 'width:240px;height:80px;background-image:url(), url(https://example.com/replacement.png) !important;';
  const result = maskAppearance(style);
  expect(result).toContain('https://example.com/replacement.png');
  expect(result).toContain('width:240px!important;height:80px!important;');
  expect(result).not.toContain('private.png');
  expect(result).not.toContain('PRIVATE');
  expect(maskAppearance('background-image:url(javascript:alert(1))')).toBe('');
  const el = document.createElement('div');
  el.textContent = 'Private original';
  setElementRedacted(el, true, style);
  expect(el.style.backgroundImage).toContain('replacement.png');
  expect(el.dataset.fableRedactionKind).toBe('mask');
  expect(el.textContent).toBe('');
  setElementRedacted(el, false);
  expect(el.textContent).toBe('Private original');
  expect(el.style.backgroundImage).toBe('');
});
