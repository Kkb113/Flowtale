import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

// Uses the real packaged extension, its service worker, content scripts and browser IndexedDB.
// The pages are deterministic HTML fixtures; no customer site or external service is contacted.
for (const interruption of ['none', 'worker-restart', 'tab-close', 'no-click', 'readback', 'screenshot-quota', 'hidden-frame', 'missing-frame', 'missing-frame-retain', 'failed-retain', 'client-reload', 'nested-frames'] as const) {
test(`a real recording survives ${interruption} and is acknowledged only after durable client storage`, async () => {
  const extension = resolve(process.env.FABLE_EXTENSION_PATH || 'packages/ext-tour/build/pinned');
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const browserErrors: string[] = [];
  context.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  try {
    await context.route('http://**/*', route => {
      const url = new URL(route.request().url());
      let body = '<!doctype html><html><body>Transfer fixture</body></html>';
      if (url.hostname === 'frame.fable.test') {
        body = '<!doctype html><html><body><h2>Foreign frame</h2><iframe src="http://capture.fable.test/child"></iframe></body></html>';
      } else if (url.pathname === '/child') {
        body = '<!doctype html><html><body><h2>Nested original origin</h2></body></html>';
      } else if (url.hostname === 'capture.fable.test') {
        body = '<!doctype html><html><body><h1>Capture fixture</h1><button id="update" onclick="document.querySelector(\'h1\').textContent=\'Updated card\'">Update card</button>'
          + (interruption === 'nested-frames' ? '<iframe id="original-handler" src="http://frame.fable.test/child" onload="this.dataset.loaded=\'yes\'"></iframe>' : '')
          + '</body></html>';
      }
      return route.fulfill({ contentType: 'text/html', body });
    });
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const source = await context.newPage();
    await source.goto('http://capture.fable.test/start');
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    if (interruption === 'readback' || interruption === 'screenshot-quota') {
      await worker.evaluate(failure => {
        const scope = globalThis as any;
        const capture = scope.chrome.tabs.captureVisibleTab.bind(scope.chrome.tabs);
        scope.injectedReadbackFailures = 0;
        scope.chrome.tabs.captureVisibleTab = async (...args: any[]) => {
          if (scope.injectedReadbackFailures === 0) {
            scope.injectedReadbackFailures++;
            throw new Error(failure === 'readback' ? 'Failed to capture tab: image readback failed'
              : 'MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota exceeded');
          }
          return capture(...args);
        };
      }, interruption);
    }
    await popup.evaluate(async () => {
      const chrome = (window as any).chrome;
      const tabs = await chrome.tabs.query({ url: 'http://capture.fable.test/*' });
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.runtime.sendMessage({ type: 'fable/START_RECORDING' });
    });
    await expect.poll(() => worker.evaluate(async () => {
      const chrome = (globalThis as any).chrome;
      return (await chrome.storage.local.get('app_state_recording')).app_state_recording;
    })).toBe(2);
    if (interruption === 'hidden-frame') {
      // A widget added after recorder injection appears in Chrome's inventory, but
      // the saved page deliberately omits it because it has no rendered content.
      await source.evaluate(() => {
        const frame = document.createElement('iframe');
        frame.hidden = true;
        frame.src = 'http://frame.fable.test/hidden';
        document.body.appendChild(frame);
      });
      await expect.poll(() => source.frames().some(frame => frame.url() === 'http://frame.fable.test/hidden')).toBe(true);
      await worker.evaluate(async () => {
        const chrome = (globalThis as any).chrome;
        const [tab] = await chrome.tabs.query({ url: 'http://capture.fable.test/start' });
        await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: () => {
          if (window === window.top) return;
          // Model an unavailable recorder in an unrelated widget/extension frame.
          const scope = globalThis as any;
          scope.fableRecorderCleanup?.();
          scope.fableRecorderCleanup = () => {};
        } });
      });
    }
    if (interruption !== 'no-click' && interruption !== 'readback') {
    await source.getByRole('button', { name: 'Update card' }).click();
    await expect.poll(() => worker.evaluate(async () => {
      const stored = await (globalThis as any).chrome.storage.local.get(null);
      return Object.entries(stored).filter(([key, value]) => key.startsWith('frames_to_process/')
        && (value as any[]).some(part => part.type === 'serdom')
        && (value as any[]).some(part => part.type === 'thumbnail')).length;
    })).toBeGreaterThan(0);
    }
    if (interruption === 'worker-restart') {
      // The ServiceWorker domain must be attached to the extension origin, not the recorded site.
      const cdp = await context.newCDPSession(popup);
      const versionReady = new Promise<string>(resolveVersion => {
        cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
          const version = versions.find(item => item.scriptURL === worker.url());
          if (version) resolveVersion(version.versionId);
        });
      });
      await cdp.send('ServiceWorker.enable');
      const versionId = await versionReady;
      await worker.evaluate(() => { (globalThis as any).phase0WorkerMarker = 'before-restart'; });
      const stopped = new Promise<void>(resolveStopped => {
        cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
          if (versions.some(item => item.versionId === versionId && item.runningStatus === 'stopped')) resolveStopped();
        });
      });
      await cdp.send('ServiceWorker.stopWorker', { versionId });
      await stopped;
      const restarted = new Promise<void>(resolveRestarted => {
        cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
          if (versions.some(item => item.versionId === versionId && item.runningStatus === 'running')) resolveRestarted();
        });
      });
      await cdp.send('ServiceWorker.startWorker', { scopeURL: `chrome-extension://${id}/` });
      await restarted;
      worker = context.serviceWorkers().find(candidate => new URL(candidate.url()).host === id)!;
      expect(await worker.evaluate(() => (globalThis as any).phase0WorkerMarker)).toBeUndefined();
      await source.goto('http://capture.fable.test/after-restart');
      await expect(source.locator('#fable-0-cm-presence')).toBeAttached({ timeout: 10000 });
      await source.getByRole('button', { name: 'Update card' }).click();
      await cdp.detach();
    } else if (interruption === 'tab-close') {
      await source.close();
    }
    if (interruption === 'missing-frame' || interruption === 'missing-frame-retain') {
      // Deterministically lose one expected subframe after the root has been durably recorded.
      await worker.evaluate(async () => {
        const chrome = (globalThis as any).chrome;
        const stored = await chrome.storage.local.get(null);
        const key = Object.keys(stored).find(key => key.startsWith('recording_expected/'))!;
        await chrome.storage.local.set({ [key]: { ...stored[key], frames: [0, 999] } });
        const partsKey = key.replace('recording_expected/', 'frames_to_process/');
        // Model a missing *visible* embedded dependency, not an unrelated browser frame.
        stored[partsKey].find((part: any) => part.type === 'serdom' && part.frameId === 0)
          .data.postProcesses.push({ type: 'iframe', path: '0' });
        await chrome.storage.local.set({ [partsKey]: stored[partsKey] });
      });
    }
    if (interruption === 'failed-retain' || interruption === 'missing-frame-retain') {
      await worker.evaluate(() => {
        const storage = (globalThis as any).chrome.storage.local;
        const set = storage.set.bind(storage);
        let fail = true;
        storage.set = async (items: object) => {
          if (fail && Object.keys(items).some(key => key.startsWith('fable/pending-capture/'))) {
            fail = false;
            throw new Error('Fixture QUOTA_BYTES failure');
          }
          return set(items);
        };
      });
    }
    await popup.evaluate(() => (window as any).chrome.runtime.sendMessage({ type: 'fable/STOP_RECORDING' }));
    if (interruption === 'missing-frame' || interruption === 'missing-frame-retain') {
      await expect(popup.getByText('Opening your demo in Fable...')).toBeVisible();
      await expect(popup.getByRole('button', { name: 'Check completion' })).not.toBeVisible();
      // The original automatic fallback keeps BOTH screens; no manual recovery or dropping a screen.
    }
    if (interruption === 'failed-retain' || interruption === 'missing-frame-retain') {
      await expect(popup.getByRole('status')).toContainText('Saved screens are retained', { timeout: 15000 });
      expect(await worker.evaluate(async () => Object.keys(await (globalThis as any).chrome.storage.local.get(null))
        .filter(key => key.startsWith('frames_to_process/')).length)).toBe(2);
      await popup.getByRole('button', { name: 'Check completion' }).click();
    }
    await expect.poll(() => context.pages().find(page => page.url().includes('/preptour?capture='))?.url(),
      { timeout: 20000 }).toBeTruthy().catch(async error => {
        const diagnostic = await worker.evaluate(async () => {
          const stored = await (globalThis as any).chrome.storage.local.get(null);
          return Object.fromEntries(Object.entries(stored).filter(([key]) => key.startsWith('recording_') || key.startsWith('frames_to_process/'))
            .map(([key, value]) => [key, Array.isArray(value) ? value.map(part => ({ type: part.type, frameId: part.frameId, size: JSON.stringify(part.data).length })) : value]));
        });
        console.log('Fixture recording metadata:', JSON.stringify(diagnostic));
        console.log('Recording browser errors:', browserErrors);
        console.log('Recording tabs:', await worker.evaluate(async () => (await (globalThis as any).chrome.tabs.query({}))
          .map((tab: any) => ({ id: tab.id, active: tab.active, url: tab.url }))));
        await test.info().attach('recording-state', { body: JSON.stringify(diagnostic, null, 2), contentType: 'application/json' });
        throw error;
      });
    const client = context.pages().find(page => page.url().includes('/preptour?capture='))!;
    await expect(client.locator('#redirect-ready')).toHaveText('1', { timeout: 15000 });
    const capture = await client.evaluate(() => new Promise<any>((resolveCapture, reject) => {
      const open = indexedDB.open('screensDB', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const read = db.transaction('screensDataStore').objectStore('screensDataStore').get('1');
        read.onerror = () => { db.close(); reject(read.error); };
        read.onsuccess = () => { db.close(); resolveCapture(read.result); };
      };
    }));
    expect(capture.captureSessionId).toBe(new URL(client.url()).searchParams.get('capture'));
    expect(capture.cookies).toBe('[]');
    if (interruption === 'readback' || interruption === 'screenshot-quota') {
      expect(await worker.evaluate(() => (globalThis as any).injectedReadbackFailures)).toBe(1);
    }
    if (interruption === 'nested-frames') {
      for (const screen of JSON.parse(capture.screensData)) {
        expect(screen.filter((part: any) => part.type === 'serdom')).toHaveLength(3);
      }
      expect(capture.screensData).toContain('Foreign frame');
      expect(capture.screensData).toContain('Nested original origin');
      await expect(source.locator('#original-handler')).toHaveAttribute('data-loaded', 'yes');
    }
    expect(JSON.parse(capture.screensData).length).toBe(['tab-close', 'no-click', 'readback'].includes(interruption) ? 1 : interruption === 'worker-restart' ? 3 : 2);
    expect(capture.screensData).toContain('Capture fixture');
    if (interruption === 'client-reload') {
      await client.reload();
      await expect(client.locator('#redirect-ready')).toHaveText('1');
    }
    await expect.poll(() => worker.evaluate(async () => Object.keys(
      await (globalThis as any).chrome.storage.local.get(null)
    ).filter(key => key.startsWith('fable/pending-capture/')).length)).toBe(0);
    if (!source.isClosed()) {
      await expect(source.locator('#fable-0-cm-presence')).not.toBeAttached();
      await expect(source.locator('h1')).toHaveText(['no-click', 'readback'].includes(interruption) ? 'Capture fixture' : 'Updated card');
      await source.getByRole('button', { name: 'Update card' }).click();
      expect(await worker.evaluate(async () => Object.keys(await (globalThis as any).chrome.storage.local.get(null))
        .filter(key => key.startsWith('frames_to_process/')).length)).toBe(0);
    }
  } finally { await context.close(); }
});
}
