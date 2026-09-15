import { expect, test } from '@playwright/test';

test('normal login presents Fable without development accounts or banners', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome to Fable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to Fable' })).toBeVisible();
  await expect(page.getByRole('button', { name: /@fable.local/ })).toHaveCount(0);
  await expect(page.getByText(/Fixture accounts|Phase 0|Local development/)).toHaveCount(0);
});

test('product pages load bundled fonts, avatars and hub thumbnails without broken images', async ({ page, request }) => {
  test.setTimeout(120000);
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-b-development-token-v1';
  const identity = { Authorization: `Bearer ${token}` };
  const orgs = await request.get(`${base}/orgsfruser`, { headers: identity });
  let org = (await orgs.json()).data.find((item: any) => item.displayName === 'Presentation checks');
  if (!org) {
    const created = await request.post(`${base}/neworg`, { headers: identity,
      data: { displayName: 'Presentation checks', thumbnail: '' } });
    expect(created.ok()).toBe(true);
    org = (await created.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subscription = await request.get(`${base}/subs`, { headers });
  if (!(await subscription.json()).data) {
    const setup = await request.post(`${base}/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(setup.ok()).toBe(true);
  }
  const hubs = await request.get(`${base}/dhs`, { headers });
  if (!(await hubs.json()).data.length) {
    expect((await request.post(`${base}/demohub`, { headers, data: { name: 'Image rendering check' } })).ok()).toBe(true);
  }
  await page.addInitScript(id => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-b');
    localStorage.setItem('fable/oid', String(id));
  }, org.id);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/demos', '/demo-hubs', '/leads', '/integrations', '/users', '/settings', '/datasets']) {
    await page.goto(path);
    await expect(page.getByAltText('Fable logo')).toBeVisible();
    await expect(page.getByAltText('fable loader')).toHaveCount(0);
    if (path === '/demos') await expect(page.getByRole('link', { name: 'rise Leads' })).toBeVisible();
    await expect(page.getByText(/Fixture accounts|Local development/)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Array.from(document.images)
      .filter(image => image.getBoundingClientRect().width > 0 && (!image.complete || image.naturalWidth === 0))
      .map(image => image.getAttribute('src'))), { message: `Images on ${path}` }).toEqual([]);
    if (path === '/demo-hubs') await expect(page.getByAltText('demo thumbnail').first()).toBeVisible();
    if (path === '/integrations') await expect(page.getByRole('alert').filter({ hasText: "Couldn't load some integrations" })).toBeVisible();
  }
  expect(await page.evaluate(async () => (await document.fonts.load('600 16px "IBM Plex Sans"')).length)).toBeGreaterThan(0);
  expect(await page.evaluate(async () => (await document.fonts.load('400 16px "IBM Plex Mono"')).length)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
