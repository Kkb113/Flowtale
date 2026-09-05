import { test, expect } from '@playwright/test';

test('local login opens real onboarding without an external identity provider', async ({ page, request }) => {
  const health = await request.get('http://localhost:18080/health');
  expect(health.ok()).toBe(true);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:/, async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      external.push(`${url.origin}${url.pathname}`);
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'user-a@fable.local', exact: true }).click();
  await expect(page).toHaveURL(/welcome|demos|select-org/);
  await expect(page.getByText('Fixture accounts and entitlements', { exact: false })).toBeVisible();
  await expect(page.getByAltText('fable loader')).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByText("Let's get your account", { exact: false })).toBeVisible();
  await page.screenshot({ path: 'test-results/phase0-local-onboarding.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('an identity service failure offers retry and recovers through the real API', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let unavailable = true;
  await page.route('**/iam', async route => {
    if (unavailable) await route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ message: 'Identity is temporarily unavailable' }) });
    else await route.continue();
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'user-a@fable.local', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your account could not be loaded' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText("Let's get your account", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test('workspace setup survives a plan outage without creating a second workspace', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let unavailable = true;
  let creations = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/neworg')) creations += 1;
  });
  await page.route('**/subs', async route => {
    if (unavailable) await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    else await route.continue();
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'user-a@fable.local', exact: true }).click();
  await expect(page.getByText("Let's get your account", { exact: false })).toBeVisible();
  const workspace = page.getByRole('button', { name: 'Open Phase 0 browser workspace', exact: true });
  if (await workspace.count()) await workspace.click();
  else {
    const createLink = page.getByRole('link', { name: 'Create a new organization', exact: true });
    if (await createLink.count()) await createLink.click();
    await page.getByLabel('Your org name', { exact: true }).fill('Phase 0 browser workspace');
    await page.getByRole('button', { name: 'Create New', exact: true }).click();
  }
  await expect(page).toHaveURL(/#(usecases|install-extension)$/);
  await page.goto('/demos');
  await expect(page.getByRole('alert').filter({ hasText: 'Your workspace plan could not be loaded' })).toBeVisible();
  const committedCreations = creations;
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByAltText('fable loader')).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByRole('alert').filter({ hasText: 'could not be loaded' })).toHaveCount(0);
  await expect(page).toHaveURL(/\/demos$/);
  await page.screenshot({ path: 'test-results/phase0-local-demos.png', fullPage: true });
  expect(creations).toBe(committedCreations);
  expect(errors).toEqual([]);
});
