import { expect, test } from '@playwright/test';

const base = 'http://localhost:18080/v1';
const token = 'fable-local-user-a-development-token-v1';

test('drafts require workspace access while published snapshots remain publicly readable', async ({ request, page }) => {
  test.setTimeout(120000);
  const unscoped = { Authorization: `Bearer ${token}` };
  const memberships = await request.get(`${base}/f/orgsfruser`, { headers: unscoped });
  expect(memberships.ok()).toBe(true);
  let org = (await memberships.json()).data.find((item: any) => item.displayName === 'Phase 0 access workspace');
  if (!org) {
    const created = await request.post(`${base}/f/neworg`, { headers: unscoped,
      data: { displayName: 'Phase 0 access workspace', thumbnail: '' } });
    expect(created.ok()).toBe(true);
    org = (await created.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subscription = await request.get(`${base}/f/subs`, { headers });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    const checkout = await request.post(`${base}/f/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(checkout.ok()).toBe(true);
    expect((await checkout.json()).data).toBeTruthy();
  }
  const foreign = { Authorization: 'Bearer fable-local-user-b-development-token-v1' };
  expect((await request.get(`${base}/f/iam`, { headers: foreign })).ok()).toBe(true);
  const loadOrCreate = async (list: string, create: string, name: string, body: object) => {
    const response = await request.get(`${base}/f/${list}`, { headers });
    expect(response.ok()).toBe(true);
    const existing = (await response.json()).data.find((item: any) => item.displayName === name);
    if (existing) return existing;
    const saved = await request.post(`${base}/f/${create}`, { headers, data: { name, ...body } });
    expect(saved.ok(), await saved.text()).toBe(true);
    return (await saved.json()).data;
  };
  const tour = await loadOrCreate('tours', 'newtour', 'Access regression demo', {});
  const hub = await loadOrCreate('dhs', 'demohub', 'Access regression hub', {});
  const html = { type: 1, name: 'html', attrs: {}, props: { proxyUrlMap: {} }, sv: 2,
    chldrn: [{ type: 1, name: 'body', attrs: {}, props: { proxyUrlMap: {} }, sv: 2, chldrn: [] }] };
  const screen = await loadOrCreate('screens', 'newscreen', 'Access regression screen', { type: 1,
    url: 'https://example.com/', body: JSON.stringify({ version: '2023-07-27', vpd: { w: 640, h: 400 },
      isHTML4: false, docTree: html }) });
  const configResponse = await request.get(`${base}/cconfig`);
  expect(configResponse.ok()).toBe(true);
  const config = (await configResponse.json()).data;
  for (const [kind, resource] of Object.entries({ tour, dh: hub, screen })) {
    expect((await request.get(`${base}/${kind}?rid=${resource.rid}`)).status()).toBe(404);
    expect((await request.get(`${base}/f/${kind}?rid=${resource.rid}`)).status()).toBe(401);
    expect((await request.get(`${base}/f/${kind}?rid=${resource.rid}`, { headers: foreign })).status()).toBe(404);
    const authorized = await request.get(`${base}/f/${kind}?rid=${resource.rid}`, { headers });
    expect(authorized.ok()).toBe(true);
    expect((await authorized.json()).data.rid).toBe(resource.rid);
    const draftFile = `${base}/f/draft/${kind === 'dh' ? 'hub' : kind}/${resource.rid}/index.json`;
    expect((await request.get(draftFile)).status()).toBe(401);
    expect((await request.get(draftFile, { headers: foreign })).status()).toBe(404);
    const content = await request.get(draftFile, { headers });
    expect(content.ok(), await content.text()).toBe(true);
    expect(content.headers()['cache-control']).toContain('no-store');
    expect(await content.json()).toBeTruthy();
    const sourcePrefix = kind === 'screen' ? config.screenAssetPath
      : kind === 'dh' ? config.demoHubAssetPath : config.tourAssetPath;
    const rawSource = await request.get(`${sourcePrefix}${resource.assetPrefixHash}/index.json`);
    expect([403, 404]).toContain(rawSource.status());
  }
  expect((await request.get(`${base}/tour/by/rid/${tour.rid}`, { headers })).status()).toBe(401);
  expect((await request.get(`${base}/tour/by/rid/${tour.rid}`, {
    headers: { 'X-Fable-Service-Token': 'fable-local-internal-service-token-development-only' },
  })).ok()).toBe(true);
  const copied = await request.post(`${base}/f/copyscreen`, { headers: foreign,
    data: { parentId: screen.id, tourRid: tour.rid } });
  expect(copied.status()).toBe(401);

  const privateMarker = `private-publication-input-${Date.now()}`;
  for (const [route, identity, resource] of [
    ['updtrprop', { tourRid: tour.rid }, tour],
    ['updtdhprops', { rid: hub.rid }, hub],
  ] as const) {
    const updated = await request.post(`${base}/f/${route}`, { headers, data: {
      ...identity, info: { ...resource.info, locked: false, productDetails: privateMarker,
        demoObjective: privateMarker, annDemoId: privateMarker, threadId: privateMarker, demoRouter: { privateMarker } },
    } });
    expect(updated.ok(), await updated.text()).toBe(true);
  }
  for (const [route, body, assetPath, resource] of [
    ['tpub', { tourRid: tour.rid }, config.pubTourAssetPath, tour],
    ['pubdh', { rid: hub.rid }, config.pubDemoHubAssetPath, hub],
  ] as const) {
    const published = await request.post(`${base}/f/${route}`, { headers, data: body });
    expect(published.ok(), await published.text()).toBe(true);
    const publishedEntity = (await published.json()).data;
    const publicMetadata = await request.get(`${assetPath}${resource.rid}/0_d_data.json`);
    expect(publicMetadata.ok()).toBe(true);
    const publicEntity = (await publicMetadata.json()).data;
    expect(JSON.stringify(publicEntity)).not.toContain(privateMarker);
    expect(publicEntity.rid).toBe(resource.rid);
    expect(publicEntity.info.locked).toBe(false);
    expect(publicEntity.createdBy).toBeUndefined();
    for (const field of ['annDemoId', 'threadId', 'productDetails', 'demoObjective', 'demoRouter']) {
      expect(publicEntity.info?.[field]).toBeUndefined();
    }
    for (const publishedScreen of publicEntity.screens || []) {
      expect(publishedScreen.createdBy).toBeUndefined();
      expect(publishedScreen.uploadUrl).toBeUndefined();
    }
    const fresh = await request.get(`${base}/f/${route === 'tpub' ? 'tour' : 'dh'}?rid=${resource.rid}`, { headers });
    expect(fresh.ok()).toBe(true);
    expect(new Date(publicEntity.updatedAt).getTime()).toBe(new Date(publishedEntity.updatedAt).getTime());
    const freshDraft = (await fresh.json()).data;
    expect(freshDraft.updatedAt).toBe(publishedEntity.updatedAt);
    expect(freshDraft.createdBy.email).toBeTruthy();
    expect(freshDraft.info.productDetails).toBe(privateMarker);
  }

  // Exercise the actual editor's authenticated read, in addition to real API/database access checks.
  await page.addInitScript(({ orgId }) => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-a');
    localStorage.setItem('fable/oid', String(orgId));
  }, { orgId: org.id });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const draftLoaded = page.waitForResponse(response => new URL(response.url()).pathname === '/v1/f/tour', { timeout: 30000 });
  await page.goto(`/demo/${tour.rid}`);
  expect((await draftLoaded).ok()).toBe(true);
  await expect(page.getByText('Access regression demo', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  for (const [path, endpoint] of [
    [`/embed/demo/${tour.rid}`, '/v1/f/tour'],
    [`/embed/tour/${tour.rid}`, '/v1/f/tour'],
    [`/hub/seeall/${hub.rid}`, '/v1/f/dh'],
    [`/hub/q/${hub.rid}`, '/v1/f/dh'],
  ]) {
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === endpoint);
    await page.goto(`${path}?staging=true`);
    const response = await loaded;
    expect(response.ok()).toBe(true);
    expect(response.request().headers().authorization).toBe(headers.Authorization);
    const anonymous = await page.context().browser()!.newContext();
    try {
      const viewer = await anonymous.newPage();
      const draftRequests: string[] = [];
      viewer.on('request', req => { if (new URL(req.url()).pathname === endpoint) draftRequests.push(req.url()); });
      await viewer.goto(`http://localhost:3000${path}?staging=true`);
      await expect(viewer.getByRole('heading', { name: 'Choose a local fixture account' })).toBeVisible();
      expect(draftRequests).toEqual([]);
    } finally { await anonymous.close(); }
  }
  for (const [route, assetPath, resource] of [
    ['renametour', config.pubTourAssetPath, tour],
    ['renamedh', config.pubDemoHubAssetPath, hub],
  ] as const) {
    const before = (await (await request.get(`${assetPath}${resource.rid}/0_d_data.json`)).json()).data;
    const name = `Renamed publication ${route} ${Date.now()}`;
    const renamed = await request.post(`${base}/f/${route}`, { headers,
      data: { rid: resource.rid, newName: name, description: 'Published rename description' } });
    expect(renamed.ok(), await renamed.text()).toBe(true);
    const identity = (await renamed.json()).data;
    const afterResponse = await request.get(`${assetPath}${identity.rid}/0_d_data.json`);
    expect(afterResponse.ok()).toBe(true);
    const after = (await afterResponse.json()).data;
    expect(after).toEqual({ ...before, rid: identity.rid, displayName: name, description: 'Published rename description' });
    expect(JSON.stringify(after)).not.toContain(privateMarker);
    const descriptionOnly = await request.post(`${base}/f/${route}`, { headers,
      data: { rid: identity.rid, newName: name, description: 'Updated description only' } });
    expect(descriptionOnly.ok(), await descriptionOnly.text()).toBe(true);
    expect((await descriptionOnly.json()).data.rid).toBe(identity.rid);
    const sameUrl = (await (await request.get(`${assetPath}${identity.rid}/0_d_data.json`)).json()).data;
    expect(sameUrl).toEqual({ ...after, description: 'Updated description only' });
  }
  expect(errors).toEqual([]);
});
