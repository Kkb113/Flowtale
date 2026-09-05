jest.mock('./local-development', () => ({ isLocalDevelopment: false }));

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  document.head.innerHTML = '';
  delete (window as any).Chargebee;
  process.env.REACT_APP_CHARGEBEE_SITE = 'fixture';
});
afterEach(() => { jest.useRealTimers(); });

it('loads once on demand and shares one initialized instance between purchase surfaces', async () => {
  const { getBillingInstance } = await import('./billing-sdk');
  expect(document.querySelector('script')).toBeNull();
  const first = getBillingInstance();
  const second = getBillingInstance();
  const instance = { openCheckout: jest.fn() };
  (window as any).Chargebee = { init: jest.fn().mockReturnValue(instance) };
  document.querySelector('script')!.dispatchEvent(new Event('load'));
  expect(await first).toBe(instance);
  expect(await second).toBe(instance);
  expect(await getBillingInstance()).toBe(instance);
  expect((window as any).Chargebee.init).toHaveBeenCalledTimes(1);
  expect(document.querySelectorAll('script')).toHaveLength(1);
});

it('removes a failed script and permits a successful retry', async () => {
  const { getBillingInstance } = await import('./billing-sdk');
  const failure = expect(getBillingInstance()).rejects.toThrow('could not load');
  document.querySelector('script')!.dispatchEvent(new Event('error'));
  await failure;
  expect(document.querySelector('script')).toBeNull();
  const retry = getBillingInstance();
  (window as any).Chargebee = { init: jest.fn().mockReturnValue({ openCheckout: jest.fn() }) };
  document.querySelector('script')!.dispatchEvent(new Event('load'));
  await expect(retry).resolves.toHaveProperty('openCheckout');
});

it('bounds provider loading and ignores late completion after a timeout', async () => {
  const { getBillingInstance } = await import('./billing-sdk');
  const failure = expect(getBillingInstance()).rejects.toThrow('too long');
  const script = document.querySelector('script')!;
  jest.advanceTimersByTime(15000);
  await failure;
  expect(script.isConnected).toBe(false);
  (window as any).Chargebee = { init: jest.fn() };
  script.dispatchEvent(new Event('load'));
  expect((window as any).Chargebee.init).not.toHaveBeenCalled();
});

it('does not contact billing from local development or an unconfigured deployment', async () => {
  const local = jest.requireMock('./local-development');
  (local as any).isLocalDevelopment = true;
  const { getBillingInstance } = await import('./billing-sdk');
  await expect(getBillingInstance()).rejects.toThrow('local development');
  expect(document.querySelector('script')).toBeNull();
  (local as any).isLocalDevelopment = false;
  delete process.env.REACT_APP_CHARGEBEE_SITE;
  await expect(getBillingInstance()).rejects.toThrow('not configured');
  expect(document.querySelector('script')).toBeNull();
});
