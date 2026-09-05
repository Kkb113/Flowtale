/* eslint-disable no-script-url -- adversarial sanitizer fixtures */
import { isSupportedVideoEmbed, richTextToPlainText, sanitizeRichText } from './rich-text-sanitizer';

function parse(html: string): Document {
  return new DOMParser().parseFromString(sanitizeRichText(html), 'text/html');
}

it('extracts narration text without inserting HTML into the live page', () => {
  const append = jest.spyOn(document.body, 'appendChild');
  expect(richTextToPlainText('<p>Hello <b>world</b></p><p>Next<br>line</p>'
    + '<script>alert(1)</script><img onerror="alert(1)" src=x>')).toBe('Hello world\nNext\nline');
  expect(append).not.toHaveBeenCalled();
  append.mockRestore();
});

it('removes executable HTML, navigation, clobbering and untrusted nested frames', () => {
  const doc = parse('<img src=x onerror="alert(1)"><script>alert(1)</script>'
    + '<svg><a xlink:href="javascript:alert(1)">bad</a></svg>'
    + '<iframe src="/demos" srcdoc="bad"></iframe><object data="bad"></object>'
    + '<a href="java&#10;script:alert(1)" id="location">bad</a>'
    + '<form action="https://attacker.invalid"><input formaction="https://attacker.invalid" autofocus></form>');
  expect(doc.querySelector('script, svg, iframe, object, form')).toBeNull();
  expect(doc.querySelector('[onerror], [formaction], [autofocus], #location')).toBeNull();
  expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false);
});

it('preserves lead-form identity, validation, hidden calculated fields and lexical metadata', () => {
  const doc = parse('<span id="fable-lead-form" data-lexical-lead-form-options="[]">'
    + '<span fable-input-field-uid="abc" fable-x-f-vfn="email" style="display:none">'
    + '<input fable-input-uid="abc" fable-lead-form-field-name="email" name="email" value="default" '
    + 'placeholder="Email" autocomplete="email"><span fable-validation-uid="abc">Error</span></span></span>');
  expect(doc.querySelector('[data-lexical-lead-form-options]')).not.toBeNull();
  expect(doc.querySelector('[fable-input-field-uid]')?.getAttribute('fable-x-f-vfn')).toBe('email');
  expect(doc.querySelector('input')?.getAttribute('fable-input-uid')).toBe('abc');
  expect(doc.querySelector('input')?.getAttribute('fable-lead-form-field-name')).toBe('email');
  expect(doc.querySelector('input')?.getAttribute('value')).toBe('default');
  expect((doc.querySelector('[fable-x-f-vfn]') as HTMLElement).style.display).toBe('none');
});

it('preserves formatting and images without host-page overlays or CSS resource requests', () => {
  const doc = parse('<p style="font-weight:700;color:red;position:fixed;inset:0;z-index:99999;'
    + 'background-image:url(https://attacker.invalid)">Hello <strong>world</strong></p>'
    + '<img src="https://assets.example.com/image.png" width="100" alt="Demo" '
    + 'style="max-width:100%;object-fit:contain">');
  const style = (doc.querySelector('p') as HTMLElement).style;
  expect(style.fontWeight).toBe('700');
  expect(style.color).toBe('red');
  expect(style.position).toBe('');
  expect(style.backgroundImage).toBe('');
  expect(doc.querySelector('strong')?.textContent).toBe('world');
  expect(doc.querySelector('img')?.getAttribute('width')).toBe('100');
});

it('keeps supported third-party videos with enforced isolation and safe links', () => {
  const doc = parse('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" '
    + 'sandbox="allow-top-navigation" srcdoc="<script>bad</script>"></iframe>'
    + '<a href="https://example.com" target="_blank" rel="opener">Visit</a>');
  expect(doc.querySelector('iframe')?.getAttribute('sandbox')).toBe(
    'allow-scripts allow-same-origin allow-presentation'
  );
  expect(doc.querySelector('iframe')?.hasAttribute('srcdoc')).toBe(false);
  expect(doc.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
});

it.each([
  'https://www.youtube.com.attacker.invalid/embed/dQw4w9WgXcQ',
  'https://www.youtube.com@attacker.invalid/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/redirect?url=https://attacker.invalid',
  'javascript:alert(1)', '/demos', 'data:text/html,hello',
])('rejects unsupported embed origin/path: %s', source => {
  expect(isSupportedVideoEmbed(source)).toBe(false);
});
