import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

for (const saveFailure of [null, 'auth-callback', 'unavailable-frame', 'previous-recording', 'http', 'logical', 'source-ack', 'tour-ack', 'copy-ack', 'final-ack', 'append-ack', 'append-conflict'] as const) {
test(saveFailure ? `capture recovery handles ${saveFailure} without losing or duplicating the recording`
  : 'a real no-click extension recording creates a manual demo through the product', async ({ request }) => {
  test.setTimeout(180000);
  const api = 'http://localhost:18080/v1/f';
  const token = 'fable-local-user-a-development-token-v1';
  const unscoped = { Authorization: `Bearer ${token}` };
  const orgs = await request.get(`${api}/orgsfruser`, { headers: unscoped });
  expect(orgs.ok()).toBe(true);
  let org = (await orgs.json()).data.find((item: any) => item.displayName === 'Phase 0 capture workspace');
  if (!org) {
    const response = await request.post(`${api}/neworg`, { headers: unscoped,
      data: { displayName: 'Phase 0 capture workspace', thumbnail: '' } });
    expect(response.ok()).toBe(true);
    org = (await response.json()).data;
  }
  const headers = { Authorization: `Bearer ${org.id}:${token}` };
  const subs = await request.get(`${api}/subs`, { headers });
  expect(subs.ok()).toBe(true);
  if (!(await subs.json()).data) {
    const response = await request.post(`${api}/checkout`, { headers,
      data: { pricingPlan: 'BUSINESS', pricingInterval: 'MONTHLY' } });
    expect(response.ok()).toBe(true);
  }
  const name = `Capture regression ${Date.now()}`;
  if (saveFailure === 'append-ack' || saveFailure === 'append-conflict') {
    const destination = await request.post(`${api}/newtour`, { headers, data: { name } });
    expect(destination.ok()).toBe(true);
    const tour = (await destination.json()).data;
    const ready = await request.post(`${api}/updtrprop`, { headers, data: { tourRid: tour.rid, inProgress: false } });
    expect(ready.ok()).toBe(true);
  }
  const extension = resolve(process.env.FABLE_EXTENSION_PATH || 'packages/ext-tour/build/pinned');
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  context.setDefaultTimeout(15000);
  const errors: string[] = [];
  const external: string[] = [];
  const failures: string[] = [];
  const guardedSaves: Array<number | undefined> = [];
  const lostAckRoute = ({ 'source-ack': '/newscreen', 'tour-ack': '/newtour', 'copy-ack': '/copyscreen', 'final-ack': '/recordtredit', 'append-ack': '/recordtredit' } as Record<string, string>)[saveFailure || ''];
  let lostAck = false;
  let changedDestination = false;
  const replayedRequests: Array<{ key: string | undefined, body: string | null }> = [];
  try {
    await context.addInitScript(({ orgId }) => {
      if (location.origin === 'http://localhost:3000') {
        sessionStorage.setItem('fable/local-fixture-account', 'user-a');
        localStorage.setItem('fable/oid', String(orgId));
      }
    }, { orgId: org.id });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (saveFailure === 'append-conflict' && url.pathname.endsWith('/recordtredit') && !changedDestination) {
        const body = route.request().postDataJSON();
        const original = await request.get(`${api}/draft/tour/${body.rid}/index.json`, { headers });
        expect(original.ok()).toBe(true);
        const document = await original.json();
        document.phase0ConcurrentEdit = 'Preserve the destination edit';
        const changed = await request.post(`${api}/recordtredit`, { headers, data: {
          rid: body.rid, editData: JSON.stringify(document), expectedRevision: body.expectedRevision,
        } });
        expect(changed.ok(), await changed.text()).toBe(true);
        changedDestination = true;
      }
      if ((saveFailure === 'http' || saveFailure === 'logical') && url.pathname.endsWith('/newscreen')) {
        return route.fulfill({ status: saveFailure === 'http' ? 503 : 200, contentType: 'application/json',
          body: JSON.stringify({ status: 'Failure', data: null, message: 'Fixture screen storage failure' }) });
      }
      if (lostAckRoute && url.pathname.endsWith(lostAckRoute)) {
        replayedRequests.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() });
        if (!lostAck) {
          const committed = await route.fetch();
          expect(committed.ok()).toBe(true);
          lostAck = true;
          return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'Failure', data: null }) });
        }
      }
      if (url.hostname === 'capture.fable.test') return route.fulfill({ contentType: 'text/html',
        body: '<!doctype html><html><head><title>Phase 0 captured product</title></head><body><h1>Product capture fixture</h1><p>A complete no-click screen.</p>'
          + (saveFailure === 'unavailable-frame' ? '<iframe src="http://frame.fable.test/embed"></iframe>' : '') + '</body></html>' });
      if (url.hostname === 'frame.fable.test') return route.fulfill({ contentType: 'text/html',
        body: '<!doctype html><html><body><h2>Captured embedded content</h2></body></html>' });
      if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        external.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    context.on('page', page => page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`)));
    context.on('response', response => {
      if (response.status() >= 400) failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    });
    context.on('request', outgoing => {
      if (new URL(outgoing.url()).pathname.endsWith('/recordtredit')) {
        guardedSaves.push(outgoing.postDataJSON()?.expectedRevision);
      }
    });
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const source = await context.newPage();
    await source.goto('http://capture.fable.test/product');
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    if (saveFailure === 'previous-recording') {
      const previous = await context.newPage();
      await previous.goto('http://localhost:3000/login');
      await previous.evaluate(() => new Promise<void>((resolveStored, reject) => {
        const open = indexedDB.open('screensDB', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('screensDataStore', { keyPath: 'id' });
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('screensDataStore', 'readwrite');
          tx.objectStore('screensDataStore').put({ id: '1', captureSessionId: 'older-unfinished',
            screensData: 'older recording must remain intact', cookies: '[]', version: '3', screenStyleData: '{}' });
          tx.oncomplete = () => { db.close(); resolveStored(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      }));
      await previous.close();
    }
    const started = await popup.evaluate(async () => {
      const chrome = (window as any).chrome;
      const [tab] = await chrome.tabs.query({ url: 'http://capture.fable.test/*' });
      await chrome.tabs.update(tab.id, { active: true });
      return chrome.runtime.sendMessage({ type: 'fable/START_RECORDING' });
    });
    expect(started).toEqual({ ok: true });
    if (saveFailure === 'unavailable-frame') {
      // An unavailable widget alongside a real embedded document must not block the whole demo.
      await worker.evaluate(() => {
        const chrome = (globalThis as any).chrome;
        const getAllFrames = chrome.webNavigation.getAllFrames.bind(chrome.webNavigation);
        chrome.webNavigation.getAllFrames = async (details: object) => [
          ...await getAllFrames(details), { frameId: 999, parentFrameId: 0, url: 'https://unavailable.fable.test/widget' },
        ];
      });
    }
    await popup.evaluate(() => (window as any).chrome.runtime.sendMessage({ type: 'fable/STOP_RECORDING' }));
    await expect.poll(() => context.pages().find(page => page.url().includes('/preptour?capture='))?.url(), { timeout: 30000 }).toBeTruthy();
    const client = context.pages().find(page => page.url().includes('/preptour?capture='))!;
    await client.waitForURL('**/create-interactive-demo?capture=*', { timeout: 60000 });
    if (saveFailure === 'auth-callback') {
      const capture = new URL(client.url()).searchParams.get('capture');
      await client.goto(`http://localhost:3000/cb/auth?capture=${encodeURIComponent(capture!)}`);
      await client.waitForURL('**/create-interactive-demo?capture=*');
      expect(new URL(client.url()).searchParams.get('capture')).toBe(capture);
    }
    if (saveFailure === 'previous-recording') {
      const older = await client.evaluate(() => new Promise<any>((resolveStored, reject) => {
        const open = indexedDB.open('screensDB', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('screensDataStore').objectStore('screensDataStore').get('1');
          read.onsuccess = () => { db.close(); resolveStored(read.result); };
          read.onerror = () => { db.close(); reject(read.error); };
        };
      }));
      expect(older.screensData).toBe('older recording must remain intact');
      await client.reload();
    }
    if (saveFailure === 'http' || saveFailure === 'logical') {
      await expect(client.getByText('Demo creation paused', { exact: true })).toBeVisible();
      await expect(client.getByRole('button', { name: 'Create Interactive Demo', exact: true })).toHaveCount(0);
      const retained = await client.evaluate(() => new Promise<boolean>((resolveCapture, reject) => {
        const open = indexedDB.open('screensDB', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('screensDataStore', 'readonly');
          const read = tx.objectStore('screensDataStore').get('1');
          let hasCapture = false;
          read.onsuccess = () => { hasCapture = Boolean(read.result?.captureSessionId && read.result?.screensData); };
          tx.oncomplete = () => { db.close(); resolveCapture(hasCapture); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      }));
      expect(retained).toBe(true);
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
      return;
    }
    if (saveFailure === 'source-ack') {
      await expect(client.getByText('Demo creation paused', { exact: true })).toBeVisible();
      await client.getByRole('button', { name: 'Retry creation', exact: true }).click();
    }
    if (saveFailure === 'append-ack' || saveFailure === 'append-conflict') {
      await client.getByRole('button', { name: 'Save in an existing interactive demo', exact: true }).click();
      await client.getByRole('combobox').fill(name);
      await client.getByText(name, { exact: true }).last().click();
      await client.getByRole('button', { name: 'Add to Demo', exact: true }).click();
    } else {
    await client.getByRole('button', { name: 'Save as a new demo', exact: true }).click();
    await client.getByRole('button', { name: 'Finish creating the demo manually', exact: true }).click();
    await client.getByLabel('Give an interactive demo name').fill(name);
    await client.getByRole('button', { name: 'Next', exact: true }).filter({ visible: true }).click();
    await client.getByRole('button', { name: 'Select', exact: true }).filter({ visible: true }).first().click();
    await client.getByRole('button', { name: 'Select', exact: true }).filter({ visible: true }).first().click();
    await client.getByRole('button', { name: 'Create Interactive Demo', exact: true }).click();
    }
    if (saveFailure === 'append-conflict') {
      await expect(client.getByText('Demo creation paused', { exact: true })).toBeVisible();
      // Ordinary reload retains the original revision; it must not silently overwrite another edit.
      await client.getByRole('button', { name: 'Retry creation', exact: true }).click();
      await expect(client.getByText('Demo creation paused', { exact: true })).toBeVisible();
      await client.getByRole('button', { name: 'Review updated destination', exact: true }).click();
      await client.getByRole('button', { name: 'Append recording to this version', exact: true }).click();
      await client.waitForURL(/\/demo\/[^/]+$/, { timeout: 60000 });
    } else if (lostAckRoute && saveFailure !== 'source-ack') {
      await expect(client.getByText('Demo creation paused', { exact: true })).toBeVisible();
      await client.getByRole('button', { name: 'Retry creation', exact: true }).click();
      await client.waitForURL(/\/demo\/[^/]+$/, { timeout: 60000 });
    } else {
      await client.waitForURL('**/preview/demo/**', { timeout: 60000 });
    }
    if (lostAckRoute) {
      expect(replayedRequests).toHaveLength(2);
      expect(replayedRequests[0].key).toBeTruthy();
      expect(replayedRequests[1]).toEqual(replayedRequests[0]);
    }
    const list = await request.get(`${api}/tours`, { headers });
    expect(list.ok()).toBe(true);
    const created = (await list.json()).data.filter((item: any) => item.displayName === name);
    expect(created).toHaveLength(1);
    const checkpoints = await client.evaluate(() => new Promise<any[]>((resolveRows, reject) => {
      const open = indexedDB.open('fable-creation-recovery', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('checkpoints', 'readonly');
        const read = tx.objectStore('checkpoints').getAll();
        tx.oncomplete = () => { db.close(); resolveRows(read.result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    }));
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints.filter(row => row.id.endsWith('/completed'))).toHaveLength(1);
    expect(checkpoints.some(row => row.id.includes('/request/'))).toBe(false);
    const draft = await request.get(`${api}/tour?rid=${created[0].rid}`, { headers });
    expect(draft.ok()).toBe(true);
    expect(guardedSaves).toHaveLength(saveFailure === 'append-conflict' ? 3 : saveFailure === 'final-ack' || saveFailure === 'append-ack' ? 2 : 1);
    if (saveFailure === 'append-conflict') {
      expect(guardedSaves[1]).toBe(guardedSaves[0]);
      expect(guardedSaves[2]).toBeGreaterThan(guardedSaves[0]!);
      const result = await request.get(`${api}/draft/tour/${created[0].rid}/index.json`, { headers });
      const document = await result.json();
      expect(document.phase0ConcurrentEdit).toBe('Preserve the destination edit');
      expect(Object.keys(document.entities)).toHaveLength(1);
    }
    expect(Number.isFinite(guardedSaves[0])).toBe(true);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(failures).toEqual(saveFailure === 'append-conflict' ? ['409 /v1/f/recordtredit', '409 /v1/f/recordtredit']
      : lostAckRoute ? [`503 /v1/f${lostAckRoute}`] : []);
    if (!saveFailure) {
      await expect(client.frameLocator('iframe').first().frameLocator('iframe')
        .getByRole('heading', { name: 'Product capture fixture', exact: true })).toBeVisible({ timeout: 30000 });
      const published = await request.post(`${api}/tpub`, { headers, data: { tourRid: created[0].rid } });
      expect(published.ok(), await published.text()).toBe(true);
      const browser = await chromium.launch();
      try {
        const viewer = await browser.newPage();
        const viewerErrors: string[] = [];
        viewer.on('pageerror', error => viewerErrors.push(error.message));
        const metadata = viewer.waitForResponse(response => new URL(response.url()).pathname.endsWith('/0_d_data.json'));
        await viewer.goto(`http://localhost:3000/p/demo/${created[0].rid}`);
        const response = await metadata;
        expect(response.ok()).toBe(true);
        expect(response.request().headers().authorization).toBeUndefined();
        const publicDemo = (await response.json()).data;
        expect(publicDemo.createdBy).toBeUndefined();
        expect(publicDemo.screens.length).toBeGreaterThan(0);
        expect(publicDemo.screens.every((screen: any) => !screen.createdBy)).toBe(true);
        await expect(viewer.frameLocator('iframe').getByRole('heading', { name: 'Product capture fixture', exact: true }))
          .toBeVisible({ timeout: 30000 });
        const deepLink = new URL(viewer.url());
        expect(deepLink.pathname.split('/').filter(Boolean).length).toBeGreaterThanOrEqual(5);
        for (const alias of ['demo', 'tour']) {
          const destination = new URL(deepLink);
          destination.search = '?ref=phase0-deep-link';
          destination.hash = '#preserved';
          const entry = new URL(destination);
          entry.pathname = entry.pathname.replace('/embed/demo/', `/p/${alias}/`);
          await viewer.goto(entry.toString());
          await expect(viewer).toHaveURL(destination.toString());
          await expect(viewer.frameLocator('iframe').getByRole('heading', { name: 'Product capture fixture', exact: true }))
            .toBeVisible({ timeout: 30000 });
        }
        expect(viewerErrors).toEqual([]);
      } finally { await browser.close(); }
    }
    expect(errors).toEqual([]);
  } finally {
    console.log('Capture product diagnostics:', { errors, external: [...new Set(external)], failures,
      pages: context.pages().map(page => page.url()) });
    for (const page of context.pages()) {
      if (page.url().startsWith('http://localhost:3000/create')) {
        console.log('Creation UI:', await page.locator('body').innerText());
      }
    }
    await context.close();
  }
});
}
