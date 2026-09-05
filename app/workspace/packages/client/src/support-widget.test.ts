import { shutdownSupportWidget, updateSupportWidget } from './support-widget';

const supportWindow = window as Window & {
  Intercom?: jest.Mock & { q?: unknown[][] };
  intercomSettings?: Record<string, unknown>;
};

afterEach(() => {
  document.getElementById('fable-support-bot')?.remove();
  delete supportWindow.Intercom;
  delete supportWindow.intercomSettings;
});

it('keeps hostile profile values out of executable markup and uses Unix seconds', () => {
  const name = '"};window.pwned=true;//</script><img src=x onerror=alert(1)>';
  updateSupportWidget(name, 'a"@example.com', '2024-01-01T00:00:00Z');
  expect(supportWindow.intercomSettings).toMatchObject({ name, created_at: 1704067200 });
  const script = document.getElementById('fable-support-bot') as HTMLScriptElement;
  expect(script.textContent).toBe('');
  expect(script.src).toBe('https://widget.intercom.io/widget/btay1o4i');
  expect(document.querySelector('img')).toBeNull();
});

it('updates the same account without injecting duplicate scripts', () => {
  supportWindow.Intercom = jest.fn();
  updateSupportWidget('First', 'user@example.com', 'invalid');
  updateSupportWidget('Updated', 'user@example.com', 'invalid');
  expect(supportWindow.Intercom.mock.calls.map(call => call[0])).toEqual(['boot', 'update']);
  expect(supportWindow.intercomSettings).not.toHaveProperty('created_at');
  expect(document.querySelectorAll('#fable-support-bot')).toHaveLength(1);
});

it('shuts down the old account before booting a different account', () => {
  supportWindow.Intercom = jest.fn();
  updateSupportWidget('First', 'first@example.com', 'invalid');
  updateSupportWidget('Second', 'second@example.com', 'invalid');
  expect(supportWindow.Intercom.mock.calls.map(call => call[0])).toEqual(['boot', 'shutdown', 'boot']);
});

it('clears queued identities and support cookies at logout without clearing app cookies', () => {
  updateSupportWidget('First', 'first@example.com', 'invalid');
  document.cookie = 'intercom-session-test=private; path=/';
  document.cookie = 'app-preference=retained; path=/';
  shutdownSupportWidget();
  expect(supportWindow.Intercom!.q).toEqual([['shutdown']]);
  expect(supportWindow.intercomSettings).toBeUndefined();
  expect(document.cookie).not.toContain('intercom-session-test');
  expect(document.cookie).toContain('app-preference=retained');
  document.cookie = 'app-preference=; Max-Age=0; path=/';
});

it('permits a later profile update to retry a failed SDK load', () => {
  updateSupportWidget('First', 'first@example.com', 'invalid');
  const script = document.getElementById('fable-support-bot')!;
  script.dispatchEvent(new Event('error'));
  expect(document.getElementById('fable-support-bot')).toBeNull();
  updateSupportWidget('First', 'first@example.com', 'invalid');
  expect(document.getElementById('fable-support-bot')).not.toBeNull();
});

it('still clears profile data when the optional SDK fails during logout', () => {
  updateSupportWidget('First', 'first@example.com', 'invalid');
  supportWindow.Intercom = jest.fn(() => { throw new Error('SDK unavailable'); });
  expect(() => shutdownSupportWidget()).not.toThrow();
  expect(supportWindow.intercomSettings).toBeUndefined();
});
