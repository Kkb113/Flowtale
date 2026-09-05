import { APIRequestContext, expect, test } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createEmptyTourDataFile, getSampleConfig, getSampleGlobalConfig } from '../packages/common/src/utils';

async function privacyWorkspace(request: APIRequestContext) {
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const identity = { Authorization: `Bearer ${token}` };
  const memberships = await request.get(`${base}/orgsfruser`, { headers: identity });
  expect(memberships.ok()).toBe(true);
  let org = (await memberships.json()).data.find((item: any) => item.displayName === 'Phase 0 publication privacy workspace');
  if (!org) {
    const created = await request.post(`${base}/neworg`, { headers: identity,
      data: { displayName: 'Phase 0 publication privacy workspace', thumbnail: '' } });
    expect(created.ok(), await created.text()).toBe(true);
    org = (await created.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subscription = await request.get(`${base}/subs`, { headers });
  expect(subscription.ok()).toBe(true);
  if (!(await subscription.json()).data) {
    const setup = await request.post(`${base}/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(setup.ok(), await setup.text()).toBe(true);
  }
  return { base, headers };
}

test('private captured CSS renders in drafts and redacted image bytes never enter the publication', async ({ request, page }) => {
  const { base, headers } = await privacyWorkspace(request);
  const orgId = Number(/Bearer (\d+):/.exec(headers.Authorization)![1]);
  const cssKey = randomUUID();
  const privateKey = randomUUID();
  const publicKey = randomUUID();
  const privatePrefix = 'http://localhost:14566/fable-local-private/local/local/proxy_asset/';
  const { S3Client, PutObjectCommand } = require('../../../jobs/node_modules/@aws-sdk/client-s3');
  const storage = new S3Client({ region: 'ap-south-1', endpoint: 'http://localhost:14566', forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
  const pixels = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=', 'base64');
  try {
    for (const [key, body, type] of [[cssKey, `.secret{background-image:url('${privatePrefix}${privateKey}')} .public{background-image:url('${privatePrefix}${publicKey}')}`, 'text/css'],
      [privateKey, pixels, 'image/png'], [publicKey, pixels, 'image/png']]) {
      await storage.send(new PutObjectCommand({ Bucket: 'fable-local-private', Key: `local/local/proxy_asset/${key}`, Body: body, ContentType: type }));
    }
  } finally { storage.destroy(); }
  const compose = path.resolve(__dirname, '../../../api/compose.local.yml');
  execFileSync('docker', ['compose', '-f', compose, 'exec', '-T', '-e', 'MYSQL_PWD=fable-local-mysql', 'db',
    'mysql', '-u', 'root', 'fable_tour_app', '-e',
    `INSERT INTO proxy_asset_access(grant_id) VALUES ('${orgId}:${cssKey}'),('${orgId}:${privateKey}'),('${orgId}:${publicKey}');`],
  { windowsHide: true, timeout: 10000 });
  expect((await request.get(privatePrefix + privateKey)).ok()).toBe(false);
  expect((await request.get(`${base}/proxy-file/${privateKey}`)).ok()).toBe(false);
  expect(await (await request.get(`${base}/proxy-file/${privateKey}`, { headers })).body()).toEqual(pixels);
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Private CSS ${Date.now()}`, settings: { vpdWidth: 800, vpdHeight: 600 } } });
  expect(created.ok()).toBe(true);
  const tour = (await created.json()).data;
  const node = (name: string, children: any[] = [], attrs: any = {}, props: any = {}): any => ({
    type: 1, name, attrs, props: { proxyUrlMap: {}, ...props }, chldrn: children, sv: 2 });
  const source = await request.post(`${base}/newscreen`, { headers, data: { name: 'Private styled capture', type: 1, url: 'https://example.com/',
    body: JSON.stringify({ version: '2023-07-27', vpd: { w: 800, h: 600 }, isHTML4: false, docTree: node('html', [
      node('head', [node('link', [], { rel: 'stylesheet', href: privatePrefix + cssKey }, { isStylesheet: true })]),
      node('body', [node('div', [], { class: 'secret', 'f-id': 'secret', style: 'width:220px;height:60px' }),
        node('div', [], { class: 'public', style: 'width:100px;height:40px' })])]) }) } });
  expect(source.ok(), await source.text()).toBe(true);
  const copied = await request.post(`${base}/copyscreen`, { headers, data: { parentId: (await source.json()).data.id, tourRid: tour.rid } });
  expect(copied.ok(), await copied.text()).toBe(true);
  const screen = (await copied.json()).data;
  const theme = getSampleGlobalConfig();
  const document = createEmptyTourDataFile(theme);
  const annotation = getSampleConfig('1.1.1', 'private-style-flow', theme, 'Private asset fixture');
  document.entities[screen.id] = { type: 'screen', ref: String(screen.id), annotations: { [annotation.id]: annotation } };
  document.opts.main = `${screen.id}/${annotation.refId}`;
  const current = (await (await request.get(`${base}/tour?rid=${tour.rid}`, { headers })).json()).data;
  expect((await request.post(`${base}/recordtredit`, { headers, data: { rid: tour.rid,
    expectedRevision: new Date(current.updatedAt).getTime(), editData: JSON.stringify(document) } })).ok()).toBe(true);
  await page.addInitScript(id => {
    sessionStorage.setItem('fable/local-fixture-account', 'user-a'); localStorage.setItem('fable/oid', String(id));
  }, orgId);
  await page.goto(`/demo/${tour.rid}/${screen.rid}/${annotation.refId}`);
  const privateElement = page.frameLocator('iframe[title="Private styled capture"]').first().locator('.secret');
  await expect(privateElement).toHaveCSS('background-image', /blob:/, { timeout: 30000 });
  let revision = new Date(screen.updatedAt).getTime();
  for (const measured of [false, true]) {
    const changed = await request.post(`${base}/recordeledit`, { headers, data: { rid: screen.rid, expectedRevision: revision,
      editData: JSON.stringify({ v: 1, edits: { '1.1.0': { 4: [1, 0, 4, '', 'blur(4px)', 'secret',
        { width: 220, height: 60, ...(measured ? { assetKeys: [privateKey] } : {}) }] } } }) } });
    expect(changed.ok(), await changed.text()).toBe(true);
    revision = new Date((await changed.json()).data.updatedAt).getTime();
    const published = await request.post(`${base}/tpub`, { headers, data: { tourRid: tour.rid } });
    expect(published.status(), await published.text()).toBe(measured ? 200 : 422);
  }
  const config = (await (await request.get('http://localhost:18080/v1/cconfig')).json()).data;
  const assets = `${config.pubTourAssetPath}assets-${tour.assetPrefixHash}/1/proxy/`;
  const css = await request.get(assets + cssKey);
  expect(css.ok()).toBe(true);
  expect(await css.text()).not.toContain(privateKey);
  expect(await css.text()).toContain('data:,');
  expect((await request.get(assets + privateKey)).ok()).toBe(false);
  expect(await (await request.get(assets + publicKey)).body()).toEqual(pixels);
  await page.goto(`/live/demo/${tour.rid}`);
  await expect(page.frameLocator('iframe').first().frameLocator('iframe').first().getByLabel('Redacted content'))
    .toHaveCSS('background-color', 'rgb(51, 65, 85)');
});

test('publication excludes local and global undo values while preserving private drafts', async ({ request }) => {
  const { base, headers } = await privacyWorkspace(request);
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Public edit projection ${Date.now()}` } });
  expect(created.ok()).toBe(true);
  let tour = (await created.json()).data;
  const source = await request.post(`${base}/newscreen`, { headers, data: { name: 'Private undo fixture', type: 1,
    body: JSON.stringify({ version: '2023-07-27', vpd: { w: 800, h: 600 }, isHTML4: false,
      docTree: { type: 1, name: 'html', attrs: { 'f-id': 'target' }, props: {}, chldrn: [], sv: 2 } }) } });
  expect(source.ok()).toBe(true);
  const copied = await request.post(`${base}/copyscreen`, { headers, data: { parentId: (await source.json()).data.id, tourRid: tour.rid } });
  expect(copied.ok()).toBe(true);
  const screen = (await copied.json()).data;
  const marker = `PRIVATE_UNDO_${Date.now()}`;
  const edits = { v: 1, lastUpdatedAtUtc: 1, edits: { '1': { '1': [1, marker, 'Current public value', 'target'] } } };
  const screenSave = await request.post(`${base}/recordeledit`, { headers, data: { rid: screen.rid,
    expectedRevision: new Date(screen.updatedAt).getTime(), editData: JSON.stringify(edits) } });
  expect(screenSave.ok(), await screenSave.text()).toBe(true);
  tour = (await (await request.get(`${base}/tour?rid=${tour.rid}`, { headers })).json()).data;
  const global = { v: 1, edits: { 'fid/target': { '1': { type: 1, fid: 'target', srnId: screen.id,
    timeInSec: 2, oldValue: marker, newValue: 'Current global value' } } } };
  const globalSave = await request.post(`${base}/recordtrgbedit`, { headers, data: { rid: tour.rid,
    expectedRevision: new Date(tour.updatedAt).getTime(), editData: JSON.stringify(global) } });
  expect(globalSave.ok(), await globalSave.text()).toBe(true);
  const publish = await request.post(`${base}/tpub`, { headers, data: { tourRid: tour.rid } });
  expect(publish.ok(), await publish.text()).toBe(true);
  const config = (await (await request.get('http://localhost:18080/v1/cconfig')).json()).data;
  const publicLocal = await request.get(`${config.pubTourAssetPath}assets-${tour.assetPrefixHash}/1/screens/${screen.assetPrefixHash}/edits.json`);
  const publicGlobal = await request.get(`${config.tourAssetPath}${tour.assetPrefixHash}/1_edits.json`);
  for (const response of [publicLocal, publicGlobal]) {
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain(marker);
  }
  expect((await publicLocal.json()).edits['1']['1'][2]).toBe('Current global value');
  expect((await publicGlobal.json()).edits).toEqual({});
  for (const [kind, rid] of [['screen', screen.rid], ['tour', tour.rid]]) {
    const privateEdits = await request.get(`${base}/draft/${kind}/${rid}/edits.json`, { headers });
    expect(privateEdits.ok()).toBe(true);
    expect(await privateEdits.text()).toContain(marker);
  }
});

test('opaque publication removes nested secrets and edit values from delivered screen bytes', async ({ request, page }) => {
  const { base, headers } = await privacyWorkspace(request);
  const marker = `REDACTED_SECRET_${Date.now()}`;
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Opaque redaction ${Date.now()}`,
    settings: { vpdWidth: 800, vpdHeight: 600 } } });
  expect(created.ok()).toBe(true);
  const tour = (await created.json()).data;
  const node = (name: string, children: any[] = [], attrs: any = {}, props: any = {}): any => ({
    type: name === '#text' ? 3 : 1, name, attrs, props: { proxyUrlMap: {}, ...props }, chldrn: children, sv: 2 });
  const secret = node('div', [node('span', [node('#text', [], {}, { textContent: marker })])],
    { 'f-id': 'private-target', title: marker, 'data-secret': marker },
    { nodeProps: { value: marker }, rect: { width: 220, height: 60 }, base64Img: marker });
  const document = { version: '2023-07-27', vpd: { w: 800, h: 600 }, isHTML4: false,
    docTree: node('html', [node('head'), node('body', [node('h1', [node('#text', [], {}, { textContent: 'Public heading' })]), secret])]) };
  const source = await request.post(`${base}/newscreen`, { headers, data: { name: 'Opaque fixture', type: 1,
    body: JSON.stringify(document) } });
  expect(source.ok()).toBe(true);
  const copied = await request.post(`${base}/copyscreen`, { headers, data: { parentId: (await source.json()).data.id, tourRid: tour.rid } });
  expect(copied.ok()).toBe(true);
  const screen = (await copied.json()).data;
  const edited = await request.post(`${base}/recordeledit`, { headers, data: { rid: screen.rid,
    expectedRevision: new Date(screen.updatedAt).getTime(), editData: JSON.stringify({ v: 1, edits: { '1.1.1': {
      4: [1, 0, 4, '', 'blur(4px)', 'private-target', { width: 220, height: 60 }],
      1: [2, marker, `${marker}_NEW`, 'private-target'] } } }) } });
  expect(edited.ok(), await edited.text()).toBe(true);
  const theme = getSampleGlobalConfig();
  const tourDocument = createEmptyTourDataFile(theme);
  const annotation = getSampleConfig('1.1.1.0', 'redaction-flow', theme, 'Redaction fixture');
  tourDocument.entities[screen.id] = { type: 'screen', ref: String(screen.id), annotations: { [annotation.id]: annotation } };
  tourDocument.opts.main = `${screen.id}/${annotation.refId}`;
  const current = (await (await request.get(`${base}/tour?rid=${tour.rid}`, { headers })).json()).data;
  const save = await request.post(`${base}/recordtredit`, { headers, data: { rid: tour.rid,
    expectedRevision: new Date(current.updatedAt).getTime(), editData: JSON.stringify(tourDocument) } });
  expect(save.ok(), await save.text()).toBe(true);
  const published = await request.post(`${base}/tpub`, { headers, data: { tourRid: tour.rid } });
  expect(published.ok(), await published.text()).toBe(true);
  const config = (await (await request.get('http://localhost:18080/v1/cconfig')).json()).data;
  const prefix = `${config.pubTourAssetPath}assets-${tour.assetPrefixHash}/1/screens/${screen.assetPrefixHash}/`;
  for (const name of ['index.json', 'edits.json']) {
    const response = await request.get(prefix + name);
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain(marker);
  }
  const metadata = await request.get(`${config.pubTourAssetPath}${tour.rid}/0_d_data.json`);
  const publicScreen = (await metadata.json()).data.screens.find((item: any) => item.id === screen.id);
  expect(publicScreen.redacted).toBe(true);
  expect(publicScreen.thumbnail).toBeUndefined();
  const privateSource = await request.get(`${base}/draft/screen/${screen.rid}/index.json`, { headers });
  expect(await privateSource.text()).toContain(marker);
  await page.goto(`/live/demo/${tour.rid}`);
  const block = page.frameLocator('iframe').first().frameLocator('iframe').first().getByLabel('Redacted content');
  await expect(block).toHaveCSS('background-color', 'rgb(51, 65, 85)');
  await expect(block).toHaveCSS('width', '220px');
  await expect(block).toHaveCSS('height', '60px');
  const activeAnnotation = page.frameLocator('iframe').first().frameLocator('iframe').first()
    .locator('.fable-annotations--container').getByText('Redaction fixture', { exact: true });
  await expect(activeAnnotation).toHaveCount(1);
  await expect(activeAnnotation).toBeVisible();
  const screenRevision = new Date((await edited.json()).data.updatedAt).getTime();
  const invalidEdit = await request.post(`${base}/recordeledit`, { headers, data: { rid: screen.rid,
    expectedRevision: screenRevision, editData: JSON.stringify({ v: 1, edits: { '1.99': {
      4: [3, 0, 4, '', 'blur(4px)', 'missing-target', { width: 220, height: 60 }] } } }) } });
  expect(invalidEdit.ok(), await invalidEdit.text()).toBe(true);
  const rejected = await request.post(`${base}/tpub`, { headers, data: { tourRid: tour.rid } });
  expect(rejected.status()).toBe(422);
  expect(await rejected.text()).toContain('missing');
  const unchanged = await request.get(`${config.pubTourAssetPath}${tour.rid}/0_d_data.json`);
  expect((await unchanged.json()).data.pubDataFileName).toBe('1_index.json');
});

test('concurrent publication assigns distinct versions and preserves independent metadata updates', async ({ request }) => {
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const memberships = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(memberships.ok()).toBe(true);
  let org = (await memberships.json()).data.find((item: any) => item.displayName === 'Phase 0 publication workspace');
  if (!org) {
    const response = await request.post(`${base}/neworg`, { headers: { Authorization: `Bearer ${token}` },
      data: { displayName: 'Phase 0 publication workspace', thumbnail: '' } });
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
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Concurrent publication ${Date.now()}` } });
  expect(created.ok(), await created.text()).toBe(true);
  const demo = (await created.json()).data;
  const results = await Promise.all([
    ...Array.from({ length: 5 }, () => request.post(`${base}/tpub`, { headers, data: { tourRid: demo.rid } })),
    request.post(`${base}/updtrprop`, { headers, data: { tourRid: demo.rid, responsive: true } }),
  ]);
  for (const response of results) expect(response.ok(), await response.text()).toBe(true);
  const versions = await Promise.all(results.slice(0, 5).map(async response => (await response.json()).data.pubDataFileName));
  expect(versions.sort()).toEqual(['1_index.json', '2_index.json', '3_index.json', '4_index.json', '5_index.json']);
  const latest = await request.get(`${base}/tour?rid=${demo.rid}`, { headers });
  expect(latest.ok()).toBe(true);
  const saved = (await latest.json()).data;
  expect(saved.pubDataFileName).toBe('5_index.json');
  expect(saved.responsive).toBe(true);
  const config = (await (await request.get('http://localhost:18080/v1/cconfig')).json()).data;
  const aliases = [demo.rid];
  let currentRid = demo.rid;
  for (let index = 0; index < 2; index++) {
    const renamed = await request.post(`${base}/renametour`, { headers,
      data: { rid: currentRid, newName: `Publication cleanup ${Date.now()} ${index}` } });
    expect(renamed.ok(), await renamed.text()).toBe(true);
    currentRid = (await renamed.json()).data.rid;
    aliases.push(currentRid);
  }
  for (const alias of aliases) {
    const publicMetadata = await request.get(`${config.pubTourAssetPath}${alias}/0_d_data.json`);
    expect(publicMetadata.ok()).toBe(true);
    expect((await publicMetadata.json()).data.assetPrefixHash).toBe(demo.assetPrefixHash);
  }
  expect((await request.get(`${config.tourAssetPath}${demo.assetPrefixHash}/5_index.json`)).ok()).toBe(true);
  const removed = await request.post(`${base}/deltour`, { headers, data: { tourRid: currentRid } });
  expect(removed.ok(), await removed.text()).toBe(true);
  for (const alias of aliases) {
    expect((await request.get(`${config.pubTourAssetPath}${alias}/0_d_data.json`)).status()).toBe(404);
    expect((await request.get(`${config.pubTourAssetPath}${alias}/manifest.json`)).status()).toBe(404);
  }
  for (const version of [1, 2, 3, 4, 5]) {
    for (const file of ['index', 'edits', 'loader']) {
      expect((await request.get(`${config.tourAssetPath}${demo.assetPrefixHash}/${version}_${file}.json`)).status()).toBe(404);
    }
  }
});

test('publication waits for a screen mutation and snapshots its committed metadata', async ({ request }) => {
  test.setTimeout(60000);
  const base = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const memberships = await request.get(`${base}/orgsfruser`, { headers: { Authorization: `Bearer ${token}` } });
  expect(memberships.ok()).toBe(true);
  const org = (await memberships.json()).data.find((item: any) => item.displayName === 'Phase 0 publication workspace');
  expect(org).toBeTruthy();
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const created = await request.post(`${base}/newtour`, { headers, data: { name: `Screen snapshot ${Date.now()}` } });
  expect(created.ok()).toBe(true);
  const demo = (await created.json()).data;
  const source = await request.post(`${base}/newscreen`, { headers, data: {
    name: 'Snapshot source', type: 1, url: 'https://example.com/',
    body: JSON.stringify({ version: '2023-07-27', vpd: { w: 640, h: 400 }, isHTML4: false,
      docTree: { type: 1, name: 'html', attrs: {}, props: { proxyUrlMap: {} }, chldrn: [], sv: 2 } }),
  } });
  expect(source.ok(), await source.text()).toBe(true);
  const attached = await request.post(`${base}/copyscreen`, { headers,
    data: { tourRid: demo.rid, parentId: (await source.json()).data.id } });
  expect(attached.ok(), await attached.text()).toBe(true);
  const screen = (await attached.json()).data;
  expect(Number.isSafeInteger(screen.id)).toBe(true);
  const compose = path.resolve(__dirname, '../../../api/compose.local.yml');
  const args = ['compose', '-f', compose, 'exec', '-T', '-e', 'MYSQL_PWD=fable-local-mysql', 'db',
    'mysql', '-u', 'root', '--batch', '--skip-column-names', '--unbuffered', 'fable_tour_app'];
  const connection = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  let diagnostics = '';
  connection.stdout.on('data', chunk => { output += chunk.toString(); });
  connection.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
  const exited = new Promise<void>((resolve, reject) => {
    connection.once('error', reject);
    connection.once('exit', code => code === 0 ? resolve() : reject(new Error(`Fixture SQL exit ${code}: ${diagnostics}`)));
  });
  // Observe failures immediately, while still awaiting cleanup in finally.
  void exited.catch(() => {});
  let publishing: ReturnType<typeof request.post> | undefined;
  try {
    connection.stdin.write(`START TRANSACTION; SELECT id FROM screen WHERE id=${screen.id} FOR UPDATE; SELECT 'screen-locked';\n`);
    await expect.poll(() => output, { timeout: 10000 }).toContain('screen-locked');
    publishing = request.post(`${base}/tpub`, { headers, data: { tourRid: demo.rid } });
    await expect.poll(() => Number(execFileSync('docker', [...args, '-e',
      "SELECT COUNT(*) FROM performance_schema.data_lock_waits w JOIN performance_schema.data_locks l ON w.REQUESTING_ENGINE_LOCK_ID=l.ENGINE_LOCK_ID WHERE l.OBJECT_SCHEMA='fable_tour_app' AND l.OBJECT_NAME='screen'"],
    { encoding: 'utf8', windowsHide: true, timeout: 10000 }).trim()), { timeout: 15000 }).toBeGreaterThan(0);
    connection.stdin.end(`UPDATE screen SET display_name='Committed snapshot screen' WHERE id=${screen.id}; COMMIT;\n`);
    await exited;
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);
    const configuration = await request.get('http://localhost:18080/v1/cconfig');
    expect(configuration.ok()).toBe(true);
    const config = (await configuration.json()).data;
    const snapshot = await request.get(`${config.pubTourAssetPath}${demo.rid}/0_d_data.json`);
    expect(snapshot.ok(), await snapshot.text()).toBe(true);
    const metadata = (await snapshot.json()).data;
    const publishedScreen = metadata.screens.find((item: any) => item.id === screen.id);
    expect(publishedScreen.displayName).toBe('Committed snapshot screen');
    expect((await request.get(publishedScreen.thumbnail)).ok()).toBe(true);
  } finally {
    if (!connection.stdin.writableEnded) connection.stdin.end('ROLLBACK;\n');
    await exited;
    await publishing;
  }
});
