import { expect, test } from '@playwright/test';
import { createEmptyTourDataFile, createLiteralProperty, getSampleGlobalConfig } from '../packages/common/dist/utils';

test('stored revisions advance for rapid and competing tour and screen writes', async ({ request }) => {
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const orgs = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(orgs.ok()).toBe(true);
  const org = (await orgs.json()).data[0];
  expect(org).toBeTruthy();
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  for (const kind of ['tour', 'screen']) {
    const created = await request.post(`${base}/new${kind}`, { headers, data: kind === 'tour'
      ? { name: `Revision fixture ${Date.now()}` }
      : { name: `Revision screen ${Date.now()}`, type: 1, body: '{}' } });
    expect(created.ok(), await created.text()).toBe(true);
    let entity = (await created.json()).data;
    const read = async () => {
      const response = await request.get(`${base}/${kind}?rid=${entity.rid}`, { headers });
      expect(response.ok(), await response.text()).toBe(true);
      return (await response.json()).data;
    };
    const revision = (value: any) => new Date(value.updatedAt).getTime();
    expect(revision(entity)).toBe(revision(await read()));
    if (kind === 'tour') {
      const duplicate = await request.post(`${base}/duptour`, { headers,
        data: { fromTourRid: entity.rid, duplicateTourName: `Revision copy ${Date.now()}` } });
      expect(duplicate.ok(), await duplicate.text()).toBe(true);
      const copy = (await duplicate.json()).data;
      const copyRead = await request.get(`${base}/tour?rid=${copy.rid}`, { headers });
      expect(copyRead.ok()).toBe(true);
      expect(revision(copy)).toBe(revision((await copyRead.json()).data));
    }
    const routes = kind === 'tour' ? ['recordtredit', 'recordtrgbedit', 'recordtrloaderedit'] : ['recordeledit'];
    for (const route of routes) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const previous = revision(entity);
        const responses = await Promise.all([1, 2].map(writer => request.post(`${base}/${route}`, {
          headers, data: { rid: entity.rid, expectedRevision: previous, editData: JSON.stringify({ writer, attempt }) },
        })));
        expect(responses.map(response => response.status()).sort()).toEqual([200, 409]);
        entity = (await responses.find(response => response.ok())!.json()).data;
        expect(revision(entity)).toBeGreaterThan(previous);
        expect(revision(await read())).toBe(revision(entity));
      }
    }
    const previous = revision(entity);
    const renamed = await request.post(`${base}/rename${kind}`, {
      headers, data: { rid: entity.rid, newName: `Renamed revision ${kind} ${Date.now()}` },
    });
    expect(renamed.ok(), await renamed.text()).toBe(true);
    entity = (await renamed.json()).data;
    expect(revision(entity)).toBeGreaterThan(previous);
    expect(revision(await read())).toBe(revision(entity));
    const stale = await request.post(`${base}/${routes[0]}`, {
      headers, data: { rid: entity.rid, expectedRevision: previous, editData: '{}' },
    });
    expect(stale.status()).toBe(409);
  }
});

test('the real editor reviews conflicts, rejects a stale comparison and recovers without losing retained changes', async ({ request, page, context }) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  const base = 'http://localhost:18080/v1';
  const token = 'fable-local-user-a-development-token-v1';
  const orgs = await request.get(`${base}/f/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(orgs.ok()).toBe(true);
  let org = (await orgs.json()).data.find((item: any) => item.displayName === 'Phase 0 save workspace');
  if (!org) {
    const response = await request.post(`${base}/f/neworg`, { headers: { Authorization: `Bearer ${token}` },
      data: { displayName: 'Phase 0 save workspace', thumbnail: '' } });
    expect(response.ok()).toBe(true);
    org = (await response.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subscription = await request.get(`${base}/f/subs`, { headers });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    const checkout = await request.post(`${base}/f/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(checkout.ok()).toBe(true);
  }
  const created = await request.post(`${base}/f/newtour`, { headers, data: { name: `Save recovery ${Date.now()}` } });
  expect(created.ok()).toBe(true);
  const tour = (await created.json()).data;
  const fileUrl = `${base}/f/draft/tour/${tour.rid}/index.json`;
  const readFile = async () => {
    const response = await request.get(`${fileUrl}?ts=${Date.now()}`, { headers });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const file = { ...createEmptyTourDataFile(getSampleGlobalConfig()), ...await readFile() };
  file.journey.hideModuleOnLoad = false;
  file.phase0UnknownField = { preserved: true };
  const persist = async () => {
    const meta = await request.get(`${base}/f/tour?rid=${tour.rid}`, { headers });
    expect(meta.ok()).toBe(true);
    const response = await request.post(`${base}/f/recordtredit`, { headers,
      data: { rid: tour.rid, editData: JSON.stringify(file), expectedRevision: new Date((await meta.json()).data.updatedAt).getTime() } });
    expect(response.ok(), await response.text()).toBe(true);
  };
  await persist();
  const key = `fable/syncnd/index/${tour.rid}`;
  const value = { entities: {}, journey: { ...file.journey, hideModuleOnLoad: true } };
  await page.addInitScript(({ orgId }) => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-a');
    localStorage.setItem('fable/oid', String(orgId));
  }, { orgId: org.id });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await page.evaluate(({ storageKey, changes }) => localStorage.setItem(storageKey, JSON.stringify({
    __fableJournalVersion: 1, value: changes, expectedRevision: 1,
  })), { storageKey: key, changes: value });
  await page.goto(`/demo/${tour.rid}`);
  await page.getByRole('button', { name: 'Review unsaved changes' }).click({ timeout: 30000 });
  const dialog = page.getByRole('dialog', { name: 'Review unsaved changes' });
  await dialog.getByRole('button', { name: 'Demo structure and appearance', exact: true }).click();
  await expect(dialog.getByText('journey / hideModuleOnLoad', { exact: true })).toBeVisible();
  // A second author writes after the comparison is loaded.
  await persist();
  await dialog.getByRole('button', { name: 'Apply reviewed changes' }).click();
  await expect(dialog.getByText('The saved version changed again.', { exact: false })).toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).not.toBeNull();
  await dialog.getByRole('button', { name: 'Demo structure and appearance', exact: true }).click();
  await expect(dialog.getByText('journey / hideModuleOnLoad', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Apply reviewed changes' }).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => (await readFile()).journey.hideModuleOnLoad).toBe(true);
  expect((await readFile()).phase0UnknownField).toEqual({ preserved: true });
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();

  // Legacy interrupted staging can also be inspected and intentionally discarded.
  await page.evaluate(({ storageKey, changes }) => localStorage.setItem(`tx/${storageKey}`, JSON.stringify(changes)),
    { storageKey: key, changes: { entities: {}, journey: { ...file.journey, hideModuleOnLoad: false } } });
  await page.reload();
  await page.getByRole('button', { name: 'Review unsaved changes' }).click({ timeout: 30000 });
  await dialog.getByRole('button', { name: 'Demo structure and appearance — interrupted edit' }).click();
  await expect(dialog.getByText('journey / hideModuleOnLoad', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Discard selected browser changes' }).click();
  expect(await page.evaluate(storageKey => localStorage.getItem(`tx/${storageKey}`), key)).not.toBeNull();
  await dialog.getByRole('button', { name: 'Confirm discard browser changes' }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(`tx/${storageKey}`), key)).toBeNull();
  expect((await readFile()).journey.hideModuleOnLoad).toBe(true);
  const second = await context.newPage();
  await second.addInitScript(({ orgId }) => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-a');
    localStorage.setItem('fable/oid', String(orgId));
  }, { orgId: org.id });
  await second.goto(`/demo/${tour.rid}`);
  await expect(second.getByRole('heading', { name: 'Waiting for the other editor tab' })).toBeVisible();
  await page.goto('/demos');
  await expect(second.getByRole('heading', { name: 'Waiting for the other editor tab' })).not.toBeVisible({ timeout: 30000 });
  await expect(second.getByText(tour.displayName, { exact: true }).first()).toBeVisible();
  await second.close();
  expect(errors).toEqual([]);
});


for (const failure of [503, 409]) {
  test('loader changes survive HTTP ' + failure + ', reload and reviewed recovery', async ({ request, page }) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(15000);
    const base = 'http://localhost:18080/v1';
    const token = 'fable-local-user-a-development-token-v1';
    const orgs = await request.get(base + '/f/orgsfruser', { headers: { Authorization: 'Bearer ' + token } });
    expect(orgs.ok()).toBe(true);
    const org = (await orgs.json()).data.find((item: any) => item.displayName === 'Phase 0 save workspace');
    expect(org).toBeTruthy();
    const headers = { Authorization: 'Bearer ' + org.id + ':' + token };
    const created = await request.post(base + '/f/newtour', { headers, data: { name: 'Loader recovery ' + Date.now() } });
    expect(created.ok()).toBe(true);
    const tour = (await created.json()).data;
    const key = 'fable/syncnd/loader/' + tour.rid;
    const ready = await request.post(base + '/f/updtrprop', { headers,
      data: { tourRid: tour.rid, inProgress: false } });
    expect(ready.ok()).toBe(true);
    const text = 'Recovered loading text ' + failure;
    await page.addInitScript(({ orgId }) => {
      sessionStorage.setItem('fable/local-fixture-account', 'user-a');
      localStorage.setItem('fable/oid', String(orgId));
    }, { orgId: org.id });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/v1/f/recordtrloaderedit', route => route.fulfill({ status: failure, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture save failure' }) }));
    await page.goto('/demo/' + tour.rid);
    await page.getByAltText('Close screen picker').click();
    await page.locator('#loader-btn button').click();
    await page.getByLabel('Loading text', { exact: true }).fill(text);
    await page.getByLabel('Loading text', { exact: true }).press('Tab');
    await expect.poll(() => page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toContain(text);
    await page.getByAltText('Close loader editor').click();
    await expect(page.getByRole('button', { name: 'Review unsaved changes' })).toBeVisible();
    await page.reload();
    await page.getByAltText('Close screen picker').click();
    await expect(page.getByRole('button', { name: 'Review unsaved changes' })).toBeVisible();
    await page.unroute('**/v1/f/recordtrloaderedit');
    await page.getByRole('button', { name: 'Review unsaved changes' }).click();
    const dialog = page.getByRole('dialog', { name: 'Review unsaved changes' });
    await dialog.getByRole('button', { name: 'Loading screen', exact: true }).click();
    await expect(dialog.getByText(text, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Apply reviewed changes' }).click();
    await expect(dialog).not.toBeVisible();
    await expect.poll(async () => {
      const file = await request.get(`${base}/f/draft/tour/${tour.rid}/loader.json?ts=${Date.now()}`, { headers });
      expect(file.ok()).toBe(true);
      return (await file.json()).loadingText._val;
    }).toBe(text);
    expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBeNull();
    await page.getByAltText('Close screen picker').click();
    await page.locator('#loader-btn button').click();
    await expect(page.getByLabel('Loading text', { exact: true })).toHaveValue(text);
    expect(errors).toEqual([]);
  });
}


for (const failure of ['http', 'copy-ack', 'save-ack']) {
test(`duplication recovers from ${failure} without another copy and awaits guarded finalization`, async ({ request, page }) => {
  page.setDefaultTimeout(15000);
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const orgs = await request.get(base + '/orgsfruser', { headers: { Authorization: 'Bearer ' + token } });
  const org = (await orgs.json()).data.find((item: any) => item.displayName === 'Phase 0 save workspace');
  expect(org).toBeTruthy();
  const headers = { Authorization: 'Bearer ' + org.id + ':' + token };
  const name = 'Duplication fixture ' + Date.now();
  const created = await request.post(base + '/newtour', { headers, data: { name } });
  expect(created.ok()).toBe(true);
  const tour = (await created.json()).data;
  const recorded = await request.post(base + '/newscreen', { headers, data: {
    name: 'Duplication source screen', type: 1, url: 'https://example.com/',
    body: JSON.stringify({ version: '2023-07-27', vpd: { w: 640, h: 400 }, isHTML4: false,
      docTree: { type: 1, name: 'html', attrs: {}, props: { proxyUrlMap: {} }, chldrn: [], sv: 2 } }),
  } });
  expect(recorded.ok(), await recorded.text()).toBe(true);
  const attached = await request.post(base + '/copyscreen', { headers,
    data: { parentId: (await recorded.json()).data.id, tourRid: tour.rid } });
  expect(attached.ok(), await attached.text()).toBe(true);
  const sourceScreen = (await attached.json()).data;
  const document = createEmptyTourDataFile(getSampleGlobalConfig()) as any;
  document.opts.main = `${sourceScreen.id}/annotation`;
  document.journey.flows = [{ main: document.opts.main, header1: 'Preserved branch', mandatory: false }];
  document.entities[sourceScreen.id] = { type: 'screen', ref: String(sourceScreen.id), annotations: {
    annotation: { id: 'annotation', refId: 'annotation', buttons: [{ type: 'next', hotspot: {
      actionType: 'navigate', actionValue: createLiteralProperty(document.opts.main),
    } }] },
  } };
  document.phase0Unknown = { preserved: true };
  const current = await request.get(base + '/tour?rid=' + tour.rid, { headers });
  expect(current.ok()).toBe(true);
  const prepared = await request.post(base + '/recordtredit', { headers, data: { rid: tour.rid,
    editData: JSON.stringify(document), expectedRevision: new Date((await current.json()).data.updatedAt).getTime() } });
  expect(prepared.ok(), await prepared.text()).toBe(true);
  expect((await request.post(base + '/updtrprop', { headers, data: { tourRid: tour.rid, inProgress: false } })).ok()).toBe(true);
  await page.addInitScript(({ orgId }) => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-a');
    localStorage.setItem('fable/oid', String(orgId));
  }, { orgId: org.id });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const failedRoute = failure === 'save-ack' ? '**/v1/f/recordtredit' : '**/v1/f/duptour';
  await page.route(failedRoute, async route => {
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    if (failure !== 'http') {
      const committed = await route.fetch();
      expect(committed.ok(), await committed.text()).toBe(true);
    }
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/demos');
  await page.getByRole('button', { name: 'Actions for ' + name, exact: true }).click();
  await page.getByText('Duplicate Demo', { exact: true }).click();
  let dialog = page.getByRole('dialog');
  const input = dialog.getByLabel('Choose a name for the new duplicated demo.');
  const copiedName = 'Guarded copy ' + Date.now();
  await input.fill(copiedName);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('The operation could not be confirmed.', { exact: false })).toBeVisible();
  await expect(input).toHaveValue(copiedName);
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await page.unroute(failedRoute);
  if (failure !== 'http') {
    await page.reload();
    await page.getByRole('button', { name: 'Actions for ' + name, exact: true }).click();
    await page.getByText('Duplicate Demo', { exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.locator('input').fill(copiedName);
  }
  let revision: unknown;
  page.on('request', outgoing => {
    if (outgoing.url().endsWith('/recordtredit')) revision = outgoing.postDataJSON().expectedRevision;
  });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Duplication successful!', { exact: true })).toBeVisible();
  await expect(dialog).not.toBeVisible();
  expect(typeof revision).toBe('number');
  expect(Number.isFinite(revision)).toBe(true);
  const tours = await request.get(base + '/tours', { headers });
  const copies = (await tours.json()).data.filter((item: any) => item.displayName === copiedName);
  expect(copies).toHaveLength(1);
  expect(copies[0].inProgress).toBe(false);
  const copiedFile = await request.get(`${base}/draft/tour/${copies[0].rid}/index.json`, { headers });
  expect(copiedFile.ok()).toBe(true);
  const copiedDocument = await copiedFile.json();
  const [newId] = Object.keys(copiedDocument.entities);
  expect(newId).not.toBe(String(sourceScreen.id));
  expect(copiedDocument.opts.main).toBe(`${newId}/annotation`);
  expect(copiedDocument.journey.flows[0].main).toBe(copiedDocument.opts.main);
  expect(copiedDocument.entities[newId].ref).toBe(newId);
  expect(copiedDocument.entities[newId].annotations.annotation.buttons[0].hotspot.actionValue._val).toBe(copiedDocument.opts.main);
  expect(copiedDocument.phase0Unknown).toEqual({ preserved: true });
  expect(errors).toEqual([]);
});
}

for (const kind of ['demo', 'hub'] as const) {
  test(`${kind} deletion retains its item and dialog on failure, then removes it after acknowledgement`, async ({ request, page }) => {
    const base = 'http://localhost:18080/v1/f';
    const token = 'fable-local-user-a-development-token-v1';
    const orgs = await request.get(base + '/orgsfruser', { headers: { Authorization: 'Bearer ' + token } });
    const org = (await orgs.json()).data.find((item: any) => item.displayName === 'Phase 0 save workspace');
    expect(org).toBeTruthy();
    const headers = { Authorization: 'Bearer ' + org.id + ':' + token };
    const name = 'Deletion fixture ' + kind + ' ' + Date.now();
    const created = await request.post(base + (kind === 'demo' ? '/newtour' : '/demohub'), { headers, data: { name } });
    expect(created.ok()).toBe(true);
    const entity = (await created.json()).data;
    if (kind === 'demo') expect((await request.post(base + '/updtrprop', { headers,
      data: { tourRid: entity.rid, inProgress: false } })).ok()).toBe(true);
    await page.addInitScript(({ orgId }) => {
      sessionStorage.setItem('fable/local-fixture-account', 'user-a');
      localStorage.setItem('fable/oid', String(orgId));
    }, { orgId: org.id });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const endpoint = base + (kind === 'demo' ? '/deltour' : '/deldh');
    await page.route(endpoint, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.goto(kind === 'demo' ? '/demos' : '/demo-hubs');
    const actions = page.getByRole('button', { name: 'Actions for ' + name, exact: true });
    if (kind === 'hub') await actions.hover(); else await actions.click();
    await page.getByText(kind === 'demo' ? 'Delete Demo' : 'Delete demo hub', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Deletion could not be confirmed.', { exact: false })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(actions).toHaveCount(1);
    await page.unroute(endpoint);
    const deleted = page.waitForResponse(endpoint);
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    expect((await deleted).ok()).toBe(true);
    await expect(dialog).not.toBeVisible();
    await expect(actions).toHaveCount(0);
    await page.reload();
    const list = await request.get(base + (kind === 'demo' ? '/tours' : '/dhs'), { headers });
    expect((await list.json()).data.some((item: any) => item.rid === entity.rid)).toBe(false);
    expect(errors).toEqual([]);
  });
}
