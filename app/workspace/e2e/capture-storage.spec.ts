import { expect, test, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Run the compiled production storage helpers against Chromium IndexedDB, without mocking transactions.
async function installHelpers(page: Page) {
  await page.goto('/__phase0/editor');
  const database = readFileSync(resolve(__dirname, '../packages/common/dist/db-utils.js'), 'utf8');
  const capture = readFileSync(resolve(__dirname, '../packages/common/dist/capture-storage.js'), 'utf8');
  await page.addScriptTag({ content: `(() => {
    const database = {};
    new Function('exports', ${JSON.stringify(database)})(database);
    const capture = {};
    new Function('exports', 'require', ${JSON.stringify(capture)})(capture, () => database);
    window.captureStorage = { ...database, ...capture };
  })();` });
}

test('two recording tabs both save independently and survive reload', async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([installHelpers(page), installHelpers(other)]);
  const commit = (tab: Page, session: string) => tab.evaluate(async id => {
    const storage = (window as any).captureStorage;
    const db = await storage.openDb(storage.DB_NAME, storage.OBJECT_STORE, 1, storage.OBJECT_KEY);
    try {
      await storage.commitCapture(db, { id: '1', captureSessionId: id, screensData: '[{}]',
        cookies: '[]', version: '3', screenStyleData: '{}' });
      return { id, committed: true };
    } catch { return { id, committed: false }; } finally { db.close(); }
  }, session);
  const results = await Promise.all([commit(page, 'first-session'), commit(other, 'second-session')]);
  expect(results.filter(result => result.committed)).toHaveLength(2);
  await page.reload();
  await installHelpers(page);
  const persisted = await page.evaluate(async () => {
    const storage = (window as any).captureStorage;
    const db = await storage.openDb(storage.DB_NAME, storage.OBJECT_STORE, 1, storage.OBJECT_KEY);
    try { return await Promise.all(['first-session', 'second-session'].map(id => storage.readCapture(db, id))); }
    finally { db.close(); }
  });
  expect(persisted.map((capture: any) => capture.captureSessionId)).toEqual(['first-session', 'second-session']);
  expect((await commit(page, 'second-session')).committed).toBe(true);
});

test('a successful put followed by transaction abort is rejected and does not persist data', async ({ page }) => {
  await installHelpers(page);
  const result = await page.evaluate(async () => {
    const storage = (window as any).captureStorage;
    const db = await storage.openDb(storage.DB_NAME, storage.OBJECT_STORE, 1, storage.OBJECT_KEY);
    let rejected = false;
    try {
      await storage.runDbRequest(db, storage.OBJECT_STORE, 'readwrite', (store: IDBObjectStore) => {
        const request = store.put({ id: '1', data: 'must-not-persist' });
        request.onsuccess = () => store.transaction.abort();
        return request;
      });
    } catch { rejected = true; }
    const data = await storage.runDbRequest(db, storage.OBJECT_STORE, 'readonly', (store: IDBObjectStore) => store.get('1'));
    db.close();
    return { rejected, data };
  });
  expect(result.rejected).toBe(true);
  expect(result.data).toBeUndefined();
});

test('an uncloneable capture rejects promptly rather than hanging inside a request callback', async ({ page }) => {
  await installHelpers(page);
  const rejected = await page.evaluate(async () => {
    const storage = (window as any).captureStorage;
    const db = await storage.openDb(storage.DB_NAME, storage.OBJECT_STORE, 1, storage.OBJECT_KEY);
    try {
      await storage.commitCapture(db, { id: '1', captureSessionId: 'invalid', uncloneable: () => undefined });
      return false;
    } catch { return true; } finally { db.close(); }
  });
  expect(rejected).toBe(true);
});
