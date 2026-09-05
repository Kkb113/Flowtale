/* eslint-disable no-script-url -- hostile capture fixtures */
import { applyCapturedInputState, isSafeCaptureAttribute, sanitizeCapturedHtml,
  sanitizeCapturedSvg } from './captured-content-security';

it('removes active document content while preserving static HTML, CSS and nested srcdoc', () => {
  const clean = sanitizeCapturedHtml('<!doctype html><html><head><style>.card{color:red}</style>'
    + '<meta http-equiv="refresh" content="0;url=https://attacker.invalid"></head><body>'
    + '<div f-id="card" onclick="alert(1)">Content</div><script>alert(1)</script>'
    + '<iframe src="https://attacker.invalid" sandbox="allow-scripts" '
    + 'srcdoc="&lt;p onclick=&quot;alert(1)&quot;&gt;Nested&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>'
    + '</body></html>');
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  expect(doc.querySelector('script, meta, [onclick]')).toBeNull();
  expect(doc.querySelector('[f-id="card"]')?.textContent).toBe('Content');
  expect(doc.querySelector('style')?.textContent).toContain('.card{color:red}');
  const frame = doc.querySelector('iframe')!;
  expect(frame.getAttribute('sandbox')).toBe('allow-same-origin');
  expect(frame.hasAttribute('src')).toBe(false);
  const nested = new DOMParser().parseFromString(frame.getAttribute('srcdoc')!, 'text/html');
  expect(nested.body.textContent).toBe('Nested');
  expect(nested.querySelector('script, [onclick]')).toBeNull();
});

it('preserves SVG sprite IDs/paths while removing executable content', () => {
  const svg = sanitizeCapturedSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><symbol id="icon">'
    + '<path d="M0 0 L10 10"/></symbol></defs><script>alert(1)</script>'
    + '<use href="#icon" onclick="alert(1)"/><foreignObject><iframe srcdoc="bad"/></foreignObject></svg>');
  expect(svg).toContain('id="icon"');
  expect(svg).toContain('href="#icon"');
  expect(svg).not.toMatch(/script|onclick|foreignObject|iframe/);
});

it('only restores captured input properties and never assigns arbitrary DOM properties', () => {
  const input = document.createElement('input');
  applyCapturedInputState(input, { type: 'checkbox',
    checked: true,
    innerHTML: '<script>bad</script>',
    onclick: 'alert(1)',
    value: 'yes' });
  expect(input.checked).toBe(true);
  expect(input.value).toBe('yes');
  expect(input.onclick).toBeNull();
  expect(input.innerHTML).toBe('');
  applyCapturedInputState(input, { type: 'password', value: 'secret' });
  expect(input.value).toBe('');
});

it.each(['onclick', 'ONERROR', 'onload', 'formaction', 'action', 'is'])('rejects active attribute %s', attr => {
  expect(isSafeCaptureAttribute('div', attr, 'bad')).toBe(false);
});

it.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>bad</script>', 'file:///private'])('rejects active resource URL %s', url => {
  expect(isSafeCaptureAttribute('image', 'href', url)).toBe(false);
});

it('fails closed when captured frame limits are exceeded', () => {
  expect(() => sanitizeCapturedHtml('safe', 9)).toThrow('Recapture');
  expect(() => sanitizeCapturedHtml('x'.repeat(5 * 1024 * 1024 + 1))).toThrow('Recapture');
});
