import { applyUpdateDiff } from './apply-diffs-anims';
import { Update } from './types';

jest.mock('../../../../utils', () => ({ addPointerEventsAutoToEl: jest.fn() }));

it('sanitizes case-insensitive iframe updates without mutating the captured diff', () => {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  const updates: Update[] = [{ attrKey: 'SRCDOC',
    attrOldVal: '',
    shouldRemove: false,
    attrNewVal: '<p onclick="bad()">Recorded content</p><script>bad()</script>' },
  { attrKey: 'SANDBOX', attrOldVal: '', attrNewVal: 'allow-scripts', shouldRemove: false }];
  const original = JSON.stringify(updates);
  updates.forEach(Object.freeze);
  applyUpdateDiff(updates, frame);
  expect(frame.getAttribute('sandbox')).toBe('allow-same-origin');
  const parsed = new DOMParser().parseFromString(frame.getAttribute('srcdoc')!, 'text/html');
  expect(parsed.body.textContent).toBe('Recorded content');
  expect(parsed.querySelector('script, [onclick]')).toBeNull();
  expect(JSON.stringify(updates)).toBe(original);
});

it('handles removed styles and uppercase style updates without changing input data', () => {
  const element = document.createElement('div');
  element.style.color = 'blue';
  applyUpdateDiff([{ attrKey: 'STYLE', attrOldVal: 'color:blue', attrNewVal: '', shouldRemove: true }], element);
  expect(element.style.color).toBe('');
  const update = Object.freeze({ attrKey: 'STYLE',
    attrOldVal: '',
    attrNewVal: 'color:red;transition:none',
    shouldRemove: false });
  applyUpdateDiff([update], element);
  expect(element.style.color).toBe('red');
  expect(element.style.transition).toBe('all 0.3s ease-out');
  expect(update.attrNewVal).toBe('color:red;transition:none');
});
