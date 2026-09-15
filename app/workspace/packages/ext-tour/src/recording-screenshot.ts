import { sleep } from "@fable/common/dist/utils";

/** Retry a transient compositor readback once, never a permission or visibility failure. */
export async function recordingScreenshot(tabId: number, windowId: number): Promise<string> {
  const original = await chrome.tabs.get(tabId);
  const assertVisible = (tab: chrome.tabs.Tab): void => {
    if (!tab.active || tab.windowId !== windowId || tab.url !== original.url || tab.pendingUrl) {
      throw new Error("The recorded page is no longer visible or has navigated");
    }
  };
  assertVisible(original);
  for (let attempt = 0; attempt < 2; attempt++) {
    assertVisible(await chrome.tabs.get(tabId));
    let data: string;
    try {
      data = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    } catch (error) {
      if (attempt !== 0 || !(error instanceof Error) || !error.message.includes("image readback failed")) throw error;
      // Failed calls can consume Chrome's screenshot quota as well.
      await sleep(1100);
      continue;
    }
    assertVisible(await chrome.tabs.get(tabId));
    return data;
  }
  throw new Error("The browser could not capture this screen");
}
