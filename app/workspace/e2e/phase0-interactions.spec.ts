import { expect, test } from '@playwright/test';
import { createEmptyTourDataFile, createLiteralProperty, getSampleConfig, getSampleGlobalConfig } from '../packages/common/src/utils';

test('published cover steps, form validation and a navigation loop work in desktop and narrow embeds', async ({ request, page }) => {
  test.setTimeout(120000);
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const memberships = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(memberships.ok()).toBe(true);
  let org = (await memberships.json()).data.find((item: any) => item.displayName === 'Phase 0 interaction workspace');
  if (!org) {
    const response = await request.post(`${base}/neworg`, { headers: { Authorization: `Bearer ${token}` },
      data: { displayName: 'Phase 0 interaction workspace', thumbnail: '' } });
    expect(response.ok(), await response.text()).toBe(true);
    org = (await response.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subscription = await request.get(`${base}/subs`, { headers });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    const setup = await request.post(`${base}/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(setup.ok(), await setup.text()).toBe(true);
  }
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Core interactions ${Date.now()}`,
    settings: { vpdWidth: 800, vpdHeight: 600, primaryKey: 'email' } } });
  expect(created.ok()).toBe(true);
  const demo = (await created.json()).data;
  const node = (name: string, children: any[] = [], text?: string): any => ({ type: text === undefined ? 1 : 3,
    name, attrs: {}, props: { proxyUrlMap: {}, ...(text === undefined ? {} : { textContent: text }) }, chldrn: children, sv: 2 });
  const source = await request.post(`${base}/newscreen`, { headers, data: { name: 'Core interaction source', type: 1,
    url: 'https://example.test/', body: JSON.stringify({ version: '2023-07-27', vpd: { w: 800, h: 600 }, isHTML4: false,
      docTree: node('html', [node('head'), node('body', [node('h1', [node('#text', [], 'Captured core product')])])]) }) } });
  expect(source.ok()).toBe(true);
  const copied = await request.post(`${base}/copyscreen`, { headers, data: { parentId: (await source.json()).data.id, tourRid: demo.rid } });
  expect(copied.ok()).toBe(true);
  const screen = (await copied.json()).data;
  const config = getSampleGlobalConfig();
  const document = createEmptyTourDataFile(config);
  const annotations = ['Welcome core fixture', 'Contact core fixture', 'Finished core fixture']
    .map(text => getSampleConfig('$', 'core-flow', config, text));
  annotations[1].isLeadFormPresent = true;
  annotations[1].bodyContent = `<p>Contact core fixture</p><div id="fable-lead-form" class="LeadForm__container">
    <div class="LeadForm__optionContainer" fable-x-f-vfn="email" fable-input-field-uid="email-field">
      <input class="LeadForm__optionInputInAnn" fable-lead-form-field-name="email" aria-label="Work email" type="email" />
      <div fable-validation-uid="email-field" style="visibility:hidden"></div>
    </div></div>`;
  const address = (index: number): string => `${screen.id}/${annotations[index].refId}`;
  annotations.forEach((annotation, index) => {
    annotation.buttons[0].text = createLiteralProperty(index === 2 ? 'Restart fixture' : 'Continue fixture');
    annotation.buttons[0].hotspot = { type: 'an-btn', on: 'click', target: '$this', actionType: 'navigate',
      actionValue: createLiteralProperty(address((index + 1) % 3)) };
  });
  document.entities[screen.id] = { type: 'screen', ref: String(screen.id),
    annotations: Object.fromEntries(annotations.map(annotation => [annotation.id, annotation])) };
  document.opts.main = address(0);
  document.opts.lf_pkf = 'email';
  const current = (await (await request.get(`${base}/tour?rid=${demo.rid}`, { headers })).json()).data;
  const saved = await request.post(`${base}/recordtredit`, { headers, data: { rid: demo.rid,
    expectedRevision: new Date(current.updatedAt).getTime(), editData: JSON.stringify(document) } });
  expect(saved.ok(), await saved.text()).toBe(true);
  const published = await request.post(`${base}/tpub`, { headers, data: { tourRid: demo.rid } });
  expect(published.ok(), await published.text()).toBe(true);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto(`/live/demo/${demo.rid}`);
    const frame = page.frameLocator('iframe').first().frameLocator('iframe[title="Core interaction source"]').locator('#fable-ann-card-rendered');
    const visibleText = (label: string) => frame.getByText(label, { exact: true });
    const button = (label: string) => frame.getByRole('button', { name: label, exact: true });
    await expect(visibleText('Welcome core fixture')).toBeVisible({ timeout: 30000 });
    await button('Continue fixture').click();
    await expect(visibleText('Contact core fixture')).toBeVisible();
    await button('Continue fixture').click();
    await expect(frame.getByText("Field can't be empty", { exact: true })).toBeVisible();
    await frame.getByRole('textbox', { name: 'Work email' }).fill('invalid');
    await button('Continue fixture').click();
    await expect(frame.getByText('Email format is not valid', { exact: true })).toBeVisible();
    await frame.getByRole('textbox', { name: 'Work email' }).fill(`fixture-${width}@example.test`);
    await button('Continue fixture').click();
    await expect(visibleText('Finished core fixture')).toBeVisible();
    await button('Restart fixture').click();
    await expect(visibleText('Welcome core fixture')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
