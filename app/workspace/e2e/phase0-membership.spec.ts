import { expect, test } from '@playwright/test';

test('owner changes affect only the selected workspace and member UI cannot administer access', async ({ request, page }) => {
  test.setTimeout(120000);
  const base = 'http://localhost:18080/v1';
  const a = 'fable-local-user-a-development-token-v1';
  const b = 'fable-local-user-b-development-token-v1';
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  async function workspace(token: string, name: string) {
    const list = await request.get(`${base}/f/orgsfruser`, { headers: headers(token) });
    expect(list.ok()).toBe(true);
    let org = (await list.json()).data.find((value: any) => value.displayName === name);
    if (!org) {
      const created = await request.post(`${base}/f/neworg`, { headers: headers(token), data: { displayName: name, thumbnail: '' } });
      expect(created.ok()).toBe(true);
      org = (await created.json()).data;
    }
    return org;
  }
  const first = await workspace(a, 'Phase 0 membership A');
  const second = await workspace(b, 'Phase 0 membership B');
  const owner = `${first.id}:${a}`;
  const member = `${first.id}:${b}`;
  const other = `${second.id}:${b}`;
  const identity = await request.get(`${base}/f/iam`, { headers: headers(other) });
  const user = (await identity.json()).data;
  const invite = await request.post(`${base}/f/new/invite`, { headers: headers(owner), data: { invitedEmail: user.email } });
  expect(invite.ok()).toBe(true);
  const inviteCode = (await invite.json()).data.code;
  const joined = await request.post(`${base}/f/orgstouser`, { headers: headers(other), data: { orgId: first.id, inviteCode } });
  expect(joined.ok()).toBe(true);
  const subscription = await request.get(`${base}/f/subs`, { headers: headers(owner) });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    expect((await request.post(`${base}/f/checkout`, { headers: headers(owner),
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } })).ok()).toBe(true);
  }
  expect((await request.post(`${base}/f/new/invite`, { headers: headers(member), data: { invitedEmail: 'third@fable.local' } })).status()).toBe(403);
  try {
    await page.addInitScript(({ orgId }) => {
      if (!sessionStorage.getItem('fable/local-fixture-account')) sessionStorage.setItem('fable/local-fixture-account', 'user-a');
      localStorage.setItem('fable/oid', String(orgId));
    }, { orgId: first.id });
    await page.goto('/users');
    await page.getByRole('button', { name: 'Deactivate Local in this workspace', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Activate Local in this workspace', exact: true })).toBeVisible();
    expect((await request.get(`${base}/f/iam`, { headers: headers(member) })).status()).toBe(401);
    expect((await request.get(`${base}/f/iam`, { headers: headers(other) })).ok()).toBe(true);
    expect((await request.post(`${base}/f/orgstouser`, { headers: headers(other), data: { orgId: first.id, inviteCode } })).status()).toBe(403);
    await page.getByRole('button', { name: 'Activate Local in this workspace', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Deactivate Local in this workspace', exact: true })).toBeVisible();
    expect((await request.get(`${base}/f/iam`, { headers: headers(member) })).ok()).toBe(true);
    await page.evaluate(() => sessionStorage.setItem('fable/local-fixture-account', 'user-b'));
    await page.reload();
    await expect(page.getByText('2 users in your org', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Invite a user', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /in this workspace/ })).toHaveCount(0);
  } finally {
    const restored = await request.post(`${base}/f/aodusr`, { headers: headers(owner), data: { userId: user.id, shouldActivate: true } });
    expect(restored.ok()).toBe(true);
  }
});
