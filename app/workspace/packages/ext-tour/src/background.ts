import { sentryCaptureException, init as sentryInit } from "@fable/common/dist/sentry";
import { sleep, snowflake } from "@fable/common/dist/utils";
import {
  SerDoc,
  ThemeStats
} from "@fable/common/dist/types";
import { AGGRESSIVE_BUFFER_PRESERVATION, getActiveTab, PURIFY_DOM_SERIALIZATION, SettingState } from "./common";
import { Msg, MsgPayload } from "./msg";
import {
  IExtStoredState,
  RecordingStatus,
  ReqScreenResize,
  ReqScreenshotData,
  ScreenSerDataFromCS,
  ScreenSerStartData,
  ScriptInitRequiredData,
} from "./types";
import {
  isMissingMessageReceiverError,
  isMissingTabError,
  isRecordableUrl
} from "./utils";
import { version } from "../package.json";
import { handleCaptureRequest, retainCapture, pendingCaptures } from "./capture-transfer";

import { captureFrameIds } from "./capture-frames";
import { recordingReadiness } from "./recording-readiness";

sentryInit("background", version);

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

const APP_STATE_IDENTITY = "app_state_identity";
const APP_RECORDING_STATE = "app_state_recording";
const FRAMES_TO_PROCESS = "frames_to_process";
const FRAMES_TO_PROCESS_ORDER = "order_of_frames_to_process";
const TABS_TO_TRACK = "app_update_listnr_for_tab_ids";
const FRAMES_IN_TAB = "frames_in_tab";
const SCREEN_DATA_FINISHED = "screen_data_finished";
const SCREEN_STYLE_DATA = "screen_style_data";
const SESSION = "recording_session";
const EXPECTED = "recording_expected/";
const RECOVERY = "recording_recovery";
const LAST_SCREENSHOT = "recording_last_screenshot_at";
interface CaptureExpectation { tabId: number; frames: number[]; styles: Record<string, ThemeStats> }
interface RecordingSession { id: string; stopping: boolean }
// All active-recording mutations share one queue. A failed write releases it, and raw
// data remains durable until the complete transfer payload has been retained.
let recordingQueue: Promise<unknown> = Promise.resolve();
function mutateRecording<T>(operation: () => Promise<T>): Promise<T> {
  const result = recordingQueue.then(operation);
  recordingQueue = result.catch(() => undefined);
  return result;
}

async function sendTabMessageIfListening(tabId: number, message: object): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (error) {
    if (isMissingMessageReceiverError(error)) return false;
    throw error;
  }
}

async function sendRuntimeMessageIfListening(message: object): Promise<boolean> {
  try {
    await chrome.runtime.sendMessage(message);
    return true;
  } catch (error) {
    if (isMissingMessageReceiverError(error)) return false;
    throw error;
  }
}

interface FrameDataToBeProcessed {
  oid: number;
  frameId: number;
  tabId: number;
  type: "serdom" | "thumbnail" | "sigstop" | "sigskip";
  data: SerDoc | string;
  interactionCtx: ScreenSerDataFromCS["interactionCtx"] | null;
}

chrome.runtime.onInstalled.addListener(async () => {
  const isOnboardingFlowAlreadyTriggered = (await chrome.storage.local.get("ONBOARDING_STATE")).ONBOARDING_STATE || 0;
  if (!isOnboardingFlowAlreadyTriggered) {
    chrome.tabs.query({ url: `${APP_CLIENT_ENDPOINT}/welcome*` }, (tabs) => {
      let openTab: chrome.tabs.Tab | null = null;

      for (const tab of tabs) {
        if (tab.url?.includes("#install-extension")) {
          openTab = tab;
          break;
        }
      }
      if (openTab && openTab.id) {
        chrome.tabs.update(openTab.id, { url: `${APP_CLIENT_ENDPOINT}/onboarding`, active: true });
      } else {
        chrome.tabs.create({ url: `${APP_CLIENT_ENDPOINT}/onboarding` });
      }
    });
    await chrome.storage.local.set({ ONBOARDING_STATE: 1 });
  }
});

chrome.runtime.onMessageExternal.addListener(
  async (data, sender, sendResponse) => {
    if (data && data.message && data.message === "version") {
      sendResponse({ version });
    }
    // used for capture screen editor screenshot. commented as not required for AI v1
    // if (data && data.sender && data.sender === "fable") {
    //   const lastTabCaptureImageData = await chrome.tabs.captureVisibleTab({ format: "png" });
    //   sendResponse({ data: lastTabCaptureImageData });
    // }
    return true;
  }
);

async function beginCapture(id: number, tabId: number): Promise<boolean> {
  const stored = await chrome.storage.local.get([APP_RECORDING_STATE, EXPECTED + id]);
  if (stored[EXPECTED + id]) return true;
  if (stored[APP_RECORDING_STATE] !== RecordingStatus.Recording) return false;
  await registerCapture(id, tabId);
  return true;
}

async function registerCapture(id: number, tabId: number): Promise<void> {
  const frames = await chrome.webNavigation.getAllFrames({ tabId }) || [];
  const expected = captureFrameIds(frames);
  if (!expected.includes(0)) throw new Error("The recorded page is no longer available");
  const order: string[] = (await chrome.storage.local.get(FRAMES_TO_PROCESS_ORDER))[FRAMES_TO_PROCESS_ORDER] || [];
  const key = `${FRAMES_TO_PROCESS}/${id}`;
  if (!order.includes(key)) order.push(key);
  await chrome.storage.local.set({ [EXPECTED + id]: { tabId, frames: expected, styles: {} },
    [key]: [],
    [FRAMES_TO_PROCESS_ORDER]: order });
}

async function addFrameDataToProcessList(id: number, part: FrameDataToBeProcessed, style?: ThemeStats): Promise<void> {
  const key = `${FRAMES_TO_PROCESS}/${id}`;
  const stored = await chrome.storage.local.get([EXPECTED + id, key]);
  const expected: CaptureExpectation | undefined = stored[EXPECTED + id];
  // Ignore late messages after completion/discard and messages from another tab.
  if (!expected || expected.tabId !== part.tabId || !expected.frames.includes(part.frameId)) return;
  const parts: FrameDataToBeProcessed[] = stored[key] || [];
  if (parts.some(value => value.type === part.type && value.frameId === part.frameId)) return;
  parts.push(part);
  if (style) expected.styles[part.frameId] = style;
  await chrome.storage.local.set({ [key]: parts, [EXPECTED + id]: expected });
  await finishIfReady();
}

function combineStyles(expectations: CaptureExpectation[]): ThemeStats {
  const combined = { nodeColor: {}, nodeBorderRadius: {} } as ThemeStats;
  for (const expected of expectations) {
    for (const style of Object.values(expected.styles)) {
      for (const name of ["nodeColor", "nodeBorderRadius"] as const) {
        for (const [tag, values] of Object.entries(style[name] || {})) {
          const tags = combined[name] as Record<string, Record<string, number>>;
          if (!tags[tag]) tags[tag] = {};
          for (const [value, count] of Object.entries(values)) tags[tag][value] = (tags[tag][value] || 0) + count;
        }
      }
    }
  }
  return combined;
}

async function openCapture(id: string): Promise<void> {
  if (!(await pendingCaptures()).some(manifest => manifest.id === id)) throw new Error("This recording is already transferred");
  // Registered content script handles navigation/load; injection at tab creation races the document.
  await chrome.tabs.create({ url: `${APP_CLIENT_ENDPOINT}/preptour?capture=${encodeURIComponent(id)}` });
}

async function finishIfReady(keepCompleteOnly = false): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const session: RecordingSession | undefined = stored[SESSION];
  if (!session?.stopping) return;
  const order: string[] = stored[FRAMES_TO_PROCESS_ORDER] || [];
  const complete = order.filter(key => recordingReadiness(stored[EXPECTED + key.split("/")[1]]?.frames, stored[key] || []).complete);
  const incomplete = order.length - complete.length;
  await chrome.storage.local.set({ [RECOVERY]: { total: order.length,
    complete: complete.length,
    message: incomplete ? `${incomplete} screen(s) are missing captured frames or a screenshot. Saved data is retained.`
      : (!complete.length ? "No complete screens were captured. You can discard this recording and try again." : "") } });
  if (!complete.length || (incomplete && !keepCompleteOnly)) return;
  const manifest = await retainCapture(
    complete.map(key => stored[key]),
    combineStyles(complete.map(key => stored[EXPECTED + key.split("/")[1]])),
    session.id
  );
  // Retain first, remove staging second. A worker restart in between reuses the same ID and checksum.
  await clearActiveRecording();
  await resetAppState();
  await openCapture(manifest.id);
  await sendRuntimeMessageIfListening({ type: Msg.RECORDING_CREATE_OR_DELETE_COMPLETED });
}

async function clearActiveRecording(): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const keys = Object.keys(stored).filter(key => key.startsWith(`${FRAMES_TO_PROCESS}/`) || key.startsWith(EXPECTED));
  await chrome.storage.local.remove([...keys, FRAMES_TO_PROCESS_ORDER, SCREEN_DATA_FINISHED, SCREEN_STYLE_DATA, SESSION, RECOVERY, FRAMES_IN_TAB]);
}

async function resetAppState(): Promise<void> {
  const tabsThatWasBeingTracked = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  await chrome.storage.local.set({ [APP_RECORDING_STATE]: RecordingStatus.Idle, [TABS_TO_TRACK]: {} });
  await Promise.all([
    ...Object.keys(tabsThatWasBeingTracked).map(async (tabId) => {
      try {
        await sendTabMessageIfListening(+tabId, { type: Msg.END_RECORDING });
        clearLoadingIcon(+tabId);
      } catch (error) {
        if (!isMissingTabError(error)) throw error;
      }
    }),
  ]);
}

async function getPersistentExtState(): Promise<IExtStoredState> {
  const stored = await chrome.storage.local.get(null);
  const order: string[] = stored[FRAMES_TO_PROCESS_ORDER] || [];
  const complete = order.filter(key => recordingReadiness(stored[EXPECTED + key.split("/")[1]]?.frames, stored[key] || []).complete).length;
  const active = !!stored[SESSION] || !!order.length || !!stored[SCREEN_DATA_FINISHED]?.length;
  return { identity: stored[APP_STATE_IDENTITY] || null,
    recordingStatus: active ? stored[APP_RECORDING_STATE] || RecordingStatus.Stopping : RecordingStatus.Idle,
    recovery: { total: order.length, complete, message: stored[RECOVERY]?.message || "" },
    pending: await pendingCaptures() };
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !Object.keys(changes).some(key => key === APP_RECORDING_STATE || key === RECOVERY
    || key === FRAMES_TO_PROCESS_ORDER || key.startsWith(`${FRAMES_TO_PROCESS}/`) || key.startsWith("fable/pending-capture/"))) return;
  getPersistentExtState().then(state => sendRuntimeMessageIfListening({ type: Msg.RECORDING_STATE, data: state }))
    .catch(() => console.warn("Recording status could not be refreshed"));
});

async function getDeviceAndTabDim() {
  const dim = {
    // dimension of document window (tab)
    tabWidth: -1,
    tabHeight: -1,
    // dimension of browser. window size + browser's ui elements
    browserWidth: -1,
    browserHeight: -1,
    // dimension of device screen
    screenWidth: -1,
    screenHeight: -1,
    // dimension of jsut the browser's ui elements
    browserUiElsOffsetWidth: -1,
    browserUiElsOffsetHeight: -1,
    fallbackTabWidth: 1200,
    fallbackTabHeight: 800,
    ar: 1.5,
    suggestResize: false,
    winId: -1,
    inited: false
  };

  const activeTab = await chrome.tabs.query({ currentWindow: true, active: true });
  if (activeTab[0] && activeTab[0].id && activeTab[0].width && activeTab[0].height) {
    dim.tabWidth = activeTab[0].width;
    dim.tabHeight = activeTab[0].height;

    const screenDim = await getFavourableScreenDimension(activeTab[0]);
    dim.screenWidth = screenDim.screenWidth || -1;
    dim.screenHeight = screenDim.screenHeight || -1;

    const browser = await chrome.windows.get(activeTab[0].windowId);
    dim.browserWidth = browser.width || -1;
    dim.browserHeight = browser.height || -1;

    if (dim.screenWidth > 0 && dim.screenHeight > 0 && dim.browserWidth > 0 && dim.browserHeight > 0) {
      dim.browserUiElsOffsetWidth = Math.max(0, dim.browserWidth - dim.tabWidth);
      dim.browserUiElsOffsetHeight = Math.max(0, dim.browserHeight - dim.tabHeight);
      dim.inited = true;

      // If the current aspect ratio is almost reaching target aspect ratio then we don't show option to resize
      const currentAr = (dim.tabWidth / dim.tabHeight) * 10;
      dim.suggestResize = Math.round(currentAr) !== (dim.ar * 10);
      dim.winId = activeTab[0].windowId;
    }
  }
  return dim;
}

function getScreenDim() {
  return {
    screenWidth: window.screen.availWidth,
    screenHeight: window.screen.availHeight
  };
}

function getFavourableScreenDimension(tab: chrome.tabs.Tab) {
  if (!isRecordableUrl(tab.url)) {
    return Promise.resolve({
      screenWidth: -1,
      screenHeight: -1
    });
  }

  return chrome.scripting.executeScript({
    target: {
      tabId: tab.id!,
    },
    func: getScreenDim
  }).then(results => {
    const result = results.filter(r => r.frameId === 0).map(r => r.result);
    return (result[0] && result[0].screenWidth && result[0].screenHeight) ? result[0] : {
      screenWidth: -1,
      screenHeight: -1
    };
  });
}

/**
 * This is how auto stitching of screens works based on user interaction
 *
 * A tab can have multiple frames (iframes). Each frame works as a separate browsing context. The content script is
 * injected to the top frame (frameId == 0) and all the cross-origin frames.
 *
 * Once the content script is injected, it registers listeners to be able to connect to the background page via
 * messaging, and it installs onclick listener on body during the capture phase of the event. Note, for the same
 * origin frame within a frame where the content script is injected, further onclick listeners are added. We don't
 * inject content script to same-origin frames.
 *
 * Every time user clicks on an element of a frame we serialize the whole frame by hooking on to the capture event
 * as mentioned above. The source frame where the interaction has happened, then sends a message to background page with
 * serialized json (for that frame) with `{ eventType: 'source' }`. This is to identify the originating frame where
 * the event has occurred. At this point we have a partial view of the tab, where serialization happened only for one
 * frame (out of many other frames) in the tab.
 *
 * Once the source event has reached to background page, background page asks all the other frames on the same tab to
 * pass their respective serialized json. We call this event { eventType: 'cascade' }. This time all the frame but the
 * originating frame passes their respective serialized json.
 *
 * Once we receive all the serialized json from the frames, we conclude that serialization of the whole tab is
 * completed.
 *
 * We need to uniquely identify the serialized json across multiple interaction, for that an id is generated that is
 * of kind [snowflake](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake). These are loosely
 * monotonically increasing ids that can be out of order if they were generated inside 1ms. This id is passed back
 * and forth via messaging.
 */
async function handleMessage(msg: MsgPayload<any>, sender: chrome.runtime.MessageSender) {
  switch (msg.type) {
    case Msg.INIT: {
      const state = await getPersistentExtState();
      const dims = await getDeviceAndTabDim();

      // First try to take the full height, then width = height * 1.5 (aspect ratio)
      // if width > available screenWidth then take full width, calculate height = width / 1.5
      const ar = 1.5; // aspect ratio
      // Getting appropriate height for the borwser window (displayheight - browser ui element) is what the
      // document can accept
      let suggestedHeight = dims.screenHeight - dims.browserUiElsOffsetHeight;
      let suggestedWidth = suggestedHeight * ar;
      // If browser is wider than the screen. Browser width is page width + browser's ui
      if ((suggestedWidth + dims.browserUiElsOffsetWidth) > dims.screenWidth) {
        suggestedWidth = dims.screenWidth - dims.browserUiElsOffsetWidth;
        suggestedHeight = suggestedWidth / ar;

        if (suggestedHeight + dims.browserUiElsOffsetHeight > dims.screenHeight) {
          suggestedHeight = dims.fallbackTabHeight;
          suggestedWidth = dims.fallbackTabWidth;
        }
      }
      await chrome.runtime.sendMessage({
        type: Msg.INITED,
        data: {
          state,
          dim: {
            suggestResize: dims.suggestResize,
            suggestedHeight,
            suggestedWidth
          }
        }
      });
      break;
    }

    case Msg.WIN_RESIZE: {
      const tMsg = msg as MsgPayload<ReqScreenResize>;
      const w = tMsg.data.w;
      const h = tMsg.data.h;

      const dims = await getDeviceAndTabDim();
      if (!dims.inited) return;

      await chrome.windows.update(dims.winId, {
        width: (w + dims.browserUiElsOffsetWidth),
        height: h + dims.browserUiElsOffsetHeight
      });

      await chrome.runtime.sendMessage({
        type: Msg.WIN_ON_RESIZE,
        data: {
          dim: { w, h, suggestResize: false }
        }
      });
      break;
    }

    case Msg.TAKE_SCREENSHOT: {
      const tMsg = msg as MsgPayload<ReqScreenshotData>;
      if (sender.frameId === 0 && sender.tab?.id) {
        // Serialize screenshots as well as frame writes. A failed/quota-limited screenshot
        // stays missing; an image from a different interaction must never be substituted.
        await mutateRecording(async () => {
          const expected = (await chrome.storage.local.get(EXPECTED + tMsg.data.id))[EXPECTED + tMsg.data.id];
          if (!expected || expected.tabId !== sender.tab!.id) return;
          const tab = await chrome.tabs.get(sender.tab!.id!);
          if (!tab.active || tab.windowId !== sender.tab!.windowId) throw new Error("The recorded tab is no longer visible");
          const data = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
          await chrome.storage.local.set({ [LAST_SCREENSHOT]: Date.now() });
          await addFrameDataToProcessList(tMsg.data.id, { oid: tMsg.data.id,
            frameId: 0,
            tabId: tab.id!,
            type: "thumbnail",
            data,
            interactionCtx: null });
        });
      }
      break;
    }

    case Msg.SCRIPT_INIT: {
      // Exchanges data that are not accessible in content script by default, and needed to be passed from background
      // script like frameId
      const tMsg = msg as MsgPayload<ScriptInitRequiredData>;
      if (sender.tab && sender.tab.id) {
        await sendTabMessageIfListening(
          sender.tab.id!,
          { type: Msg.SCRIPT_INIT_DATA, data: { frameId: sender.frameId || 0, scriptId: tMsg.data.scriptId } }
        );
      }
      break;
    }

    case Msg.FRAME_SERIALIZATION_START: {
      const tMsg = msg as MsgPayload<ScreenSerStartData>;
      if (tMsg.data.eventType === "source" && sender.tab?.id) {
        const accepted = await mutateRecording(() => beginCapture(tMsg.data.id, sender.tab!.id!));
        if (accepted) {
          await sendTabMessageIfListening(
            sender.tab.id,
            { type: Msg.SERIALIZE_FRAME, data: { srcFrameId: sender.frameId ?? -1, id: tMsg.data.id } }
          );
        }
      }
      break;
    }

    case Msg.FRAME_SERIALIZED: {
      const tMsg = msg as MsgPayload<ScreenSerDataFromCS>;
      if (sender.tab?.id) {
        await mutateRecording(() => addFrameDataToProcessList(tMsg.data.id, {
          frameId: sender.frameId ?? -1,
          oid: tMsg.data.id,
          tabId: sender.tab!.id!,
          type: "serdom",
          data: tMsg.data.serDoc,
          interactionCtx: tMsg.data.interactionCtx,
        }, tMsg.data.screenStyle));
      }
      break;
    }

    case Msg.RESET_STATE: {
      // Reset is a recovery check, never a browser-wide storage wipe.
      await mutateRecording(() => finishIfReady());
      break;
    }

    case Msg.RECOVER_COMPLETE: {
      await mutateRecording(() => finishIfReady(true));
      break;
    }

    case Msg.OPEN_CAPTURE: {
      await openCapture(msg.data.id);
      break;
    }

    case Msg.START_RECORDING: {
      await mutateRecording(async () => {
        const stored = await chrome.storage.local.get([SESSION, FRAMES_TO_PROCESS_ORDER, SCREEN_DATA_FINISHED]);
        if (stored[SESSION] || stored[FRAMES_TO_PROCESS_ORDER]?.length || stored[SCREEN_DATA_FINISHED]?.length) {
          throw new Error("Finish or discard the existing recording before starting another");
        }
        await resetAppState();
        await chrome.storage.local.set({ [SESSION]: { id: crypto.randomUUID(), stopping: false } });
      });
      try {
        const recordingStarted = await startRecording();
        if (!recordingStarted) throw new Error("Open a web page to start recording");
        await chrome.storage.local.set({ [APP_RECORDING_STATE]: RecordingStatus.Recording });
      } catch (error) {
        await mutateRecording(async () => { await clearActiveRecording(); await resetAppState(); });
        throw error;
      }
      break;
    }

    case Msg.REINJECT_CONTENT_SCRIPT: {
      if (!sender.tab?.id) return;
      await mutateRecording(async () => {
        const stored = await chrome.storage.local.get([APP_RECORDING_STATE, TABS_TO_TRACK]);
        if (stored[APP_RECORDING_STATE] !== RecordingStatus.Recording || !stored[TABS_TO_TRACK]?.[sender.tab!.id!]) return;
        const tab = await chrome.tabs.get(sender.tab!.id!);
        await injectContentScriptInCrossOriginFrames({ id: tab.id!, url: tab.url! });
      });
      break;
    }

    case Msg.DELETE_RECORDING: {
      await mutateRecording(async () => {
        await chrome.storage.local.set({ [APP_RECORDING_STATE]: RecordingStatus.Deleting });
        await clearActiveRecording();
        await resetAppState();
      });
      await sendRuntimeMessageIfListening({ type: Msg.RECORDING_CREATE_OR_DELETE_COMPLETED });
      break;
    }

    case Msg.STOP_RECORDING: {
      const ending = await mutateRecording(async () => {
        const stored = await chrome.storage.local.get(SESSION);
        const session: RecordingSession = stored[SESSION] || { id: crypto.randomUUID(), stopping: false };
        if (session.stopping) { await finishIfReady(); return null; }
        const tab = await getTabForRecordingStop();
        if (!tab?.id) {
          await chrome.storage.local.set({ [SESSION]: { ...session, stopping: true }, [APP_RECORDING_STATE]: RecordingStatus.Stopping });
          await finishIfReady();
          return null;
        }
        const id = snowflake();
        await registerCapture(id, tab.id);
        await chrome.storage.local.set({ [SESSION]: { ...session, stopping: true }, [APP_RECORDING_STATE]: RecordingStatus.Stopping });
        await addFrameDataToProcessList(id, { frameId: 0,
          oid: id,
          tabId: tab.id,
          type: "sigstop",
          data: "",
          interactionCtx: null });
        // Chrome permits two screenshots per second. Delay the final *capture*, not
        // completion, so its DOM and screenshot describe the same new interaction.
        // Persisted timing also covers a worker restart between clicks and Stop.
        const lastScreenshot = (await chrome.storage.local.get(LAST_SCREENSHOT))[LAST_SCREENSHOT] || 0;
        await sleep(Math.max(0, Math.min(1100, 1100 - (Date.now() - lastScreenshot))));
        return { id, tabId: tab.id };
      });
      if (ending) {
        await sendTabMessageIfListening(ending.tabId, { type: Msg.STOP_RECORDING, data: { id: ending.id } });
        clearLoadingIcon(ending.tabId);
      }
      break;
    }

    case Msg.CLIENT_CONTENT_INIT: {
      // An already-open tab can still contain the previous extension script.
      // Reload installs the acknowledged protocol; never discard data for an old receiver.
      if (sender.tab?.id && new URL(sender.url || "about:blank").origin === new URL(APP_CLIENT_ENDPOINT).origin) {
        await chrome.tabs.reload(sender.tab.id);
      }
      break;
    }

    case Msg.INIT_REGISTERED_CONTENT_SCRIPTS: {
      await chrome.scripting.unregisterContentScripts();
      initRegisteredContentScripts();
      break;
    }

    case Msg.__TEST__: {
      // WARN for testing
      // const store = await chrome.cookies.getAllCookieStores();
      // const cookies = await chrome.cookies.getAll({});
      // const pcookies = await (chrome.cookies.getAll as any)({ partitionKey: {} });
      // const tab = await getActiveTab();
      // const framesInPage = (await chrome.webNavigation.getAllFrames({
      //   tabId: tab!.id as number,
      // })) || [];

      // console.log(">>> [ frames ]", framesInPage);
      // console.log(">> [store]", store);
      // console.log(">> [cookies]", cookies);
      // console.log(">> [partitioned cookies]", pcookies);
      // console.log(">> [filtered]", cookies.filter(_ => _.name === "vscode-secret-key-path" || _.name === "vscode-cli-secret-half" || _.name === "WorkstationJwtPartitioned"));
      // console.log(">> [filtered]", (pcookies as chrome.cookies.Cookie[]).filter(_ => _.name === "vscode-secret-key-path" || _.name === "vscode-cli-secret-half" || _.name === "WorkstationJwtPartitioned"));
      break;
    }

    default:
      break;
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (["fable/CAPTURE_MANIFEST", "fable/CAPTURE_CHUNK", "fable/CAPTURE_ACK"].includes(message.type)) {
    handleCaptureRequest(message, sender).then(respond).catch(error => respond({ error: error.message }));
    return true;
  }
  if (sender.id !== chrome.runtime.id) return false;
  const pageCommands = [Msg.INIT, Msg.WIN_RESIZE, Msg.RESET_STATE, Msg.START_RECORDING, Msg.STOP_RECORDING,
    Msg.DELETE_RECORDING, Msg.RECOVER_COMPLETE, Msg.OPEN_CAPTURE, Msg.INIT_REGISTERED_CONTENT_SCRIPTS];
  if (pageCommands.includes(message.type) && !sender.url?.startsWith(chrome.runtime.getURL(""))) return false;
  handleMessage(message, sender).then(() => respond({ ok: true })).catch(async () => {
    const error = "Recording could not finish this operation. Saved screens are retained; open the extension to recover them.";
    await chrome.storage.local.set({ [RECOVERY]: { message: error } }).catch(() => undefined);
    respond({ error });
  });
  return true;
});

function showLoadingIcon(tabId: number) {
  return Promise.all([
    chrome.action.setBadgeText({
      tabId,
      text: "🔘",
    }),
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: "#FEDF64"
    })
  ]);
}

function clearLoadingIcon(tabId: number) {
  chrome.action.setBadgeText({
    tabId,
    text: "",
  });
}

async function injectContentScriptInCrossOriginFrames(tab: { id: number, url: string }) {
  if (!isRecordableUrl(tab.url)) return;

  // Cross-origin frames document are not accessible because of CORS hence we inject separate scripts to all
  // cross-origin frames. The same origin frames are read from inside the parent frame itself
  const framesInPage = (await chrome.webNavigation.getAllFrames({
    tabId: tab.id,
  })) || [];
  const crossOriginFrameIds = captureFrameIds(framesInPage);

  const framesInTab = (await chrome.storage.local.get(FRAMES_IN_TAB))[FRAMES_IN_TAB] || {};
  framesInTab[`${tab.id}`] = crossOriginFrameIds;
  await chrome.storage.local.set({ [FRAMES_IN_TAB]: framesInTab });
  if (crossOriginFrameIds.length) {
    await chrome.scripting.executeScript<Array<any>, SerDoc>({
      target: { tabId: tab.id, frameIds: crossOriginFrameIds },
      files: ["content.js"],
    });
  }
}

function registerContentScriptWithId(id: string, script: string): void {
  chrome.scripting
    .registerContentScripts([{
      id,
      js: [script],
      persistAcrossSessions: false,
      matches: ["https://*/*"],
      runAt: "document_start",
      world: "MAIN",
      allFrames: true,
    }])
    .then(() => {
    })
    .catch((err) => sentryCaptureException(err));
}

function initRegisteredContentScripts() {
  const drawingBufferScriptId = "fable/preservedrawingbuffer";
  const purifyDomScriptId = "fable/purifydom";

  chrome.scripting.getRegisteredContentScripts()
    .then(async (scripts) => {
      if (!scripts.some(script => script.id === "fable/capture-transfer")) {
        await chrome.scripting.registerContentScripts([{ id: "fable/capture-transfer",
          js: ["client_content.js"],
          matches: [`${APP_CLIENT_ENDPOINT}/preptour*`],
          runAt: "document_idle" }]);
      }
      const scriptExists = scripts.find(script => script.id === drawingBufferScriptId);
      const purifyDomScriptExists = scripts.find(script => script.id === purifyDomScriptId);

      chrome.storage.local.get([PURIFY_DOM_SERIALIZATION, AGGRESSIVE_BUFFER_PRESERVATION], (result) => {
        const purifyDom = result[PURIFY_DOM_SERIALIZATION] || SettingState.OFF;
        const aggressiveBuffer = result[AGGRESSIVE_BUFFER_PRESERVATION] || SettingState.ON;

        if (aggressiveBuffer === SettingState.ON && !scriptExists) {
          registerContentScriptWithId(drawingBufferScriptId, "preserve_drawing_buffer.js");
        }

        if (purifyDom === SettingState.ON && !purifyDomScriptExists) {
          registerContentScriptWithId(purifyDomScriptId, "purify_dom_serialization.js");
        }
      });
    }).catch(err => sentryCaptureException(err));
}

initRegisteredContentScripts();

async function onTabStateUpdate(tabId: number, info: chrome.tabs.TabChangeInfo) {
  const state = (await chrome.storage.local.get(APP_RECORDING_STATE))[APP_RECORDING_STATE];
  if (state !== RecordingStatus.Recording) return;
  const tabsToLookFor = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  if (info.status === "complete" && tabId in tabsToLookFor) {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !isRecordableUrl(tab.url)) return;
    tabsToLookFor[tabId] = tab.url;
    await chrome.storage.local.set({
      [TABS_TO_TRACK]: tabsToLookFor
    });
    await injectContentScriptInCrossOriginFrames({ id: tabId, url: tab.url || "" });
    await showLoadingIcon(tabId);
  }
}

async function onTabActive(activeInfo: chrome.tabs.TabActiveInfo) {
  const state = (await chrome.storage.local.get(APP_RECORDING_STATE))[APP_RECORDING_STATE];
  if (state !== RecordingStatus.Recording) return;
  const tabsToLookFor = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  if (activeInfo.tabId in tabsToLookFor) return;

  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab || !isRecordableUrl(tab.url)) return;

  tabsToLookFor[activeInfo.tabId] = tab.url;
  await chrome.storage.local.set({
    [TABS_TO_TRACK]: tabsToLookFor
  });
  await injectContentScriptInCrossOriginFrames({ id: activeInfo.tabId, url: tab.url || "" });
  await showLoadingIcon(activeInfo.tabId);
}

async function getTabForRecordingStop(): Promise<chrome.tabs.Tab | null> {
  const tabsToLookFor = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id && activeTab.id in tabsToLookFor && isRecordableUrl(activeTab.url)) {
    return activeTab;
  }

  const trackedTabIds = Object.keys(tabsToLookFor).reverse();
  for (const trackedTabId of trackedTabIds) {
    try {
      const tab = await chrome.tabs.get(+trackedTabId);
      if (isRecordableUrl(tab.url)) return tab;
    } catch {
      // A recorded tab may have been closed before the user stopped the session.
    }
  }

  return null;
}

async function startRecording(): Promise<boolean> {
  const tab = await getActiveTab();
  if (!(tab && tab.id)) {
    throw new Error("Active tab not found. Are you focused on the browser?");
  }
  if (!isRecordableUrl(tab.url)) {
    return false;
  }

  await Promise.all([
    await chrome.storage.local.set({
      [TABS_TO_TRACK]: { [tab.id]: tab.url }
    }),
    await showLoadingIcon(tab.id),
    await injectContentScriptInCrossOriginFrames({ id: tab.id!, url: tab.url! }),
    await chrome.tabs.sendMessage(tab.id!, { type: Msg.SHOW_COUNTDOWN_MODAL }),
  ]);
  return true;
}

// Manifest V3 recreates this module after suspension. Register browser event listeners
// synchronously on every worker start and use persisted recording state to gate work.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  mutateRecording(() => onTabStateUpdate(tabId, info)).catch(() => console.warn("Could not prepare the recording tab; saved frames are retained"));
});
chrome.tabs.onActivated.addListener(info => {
  mutateRecording(() => onTabActive(info)).catch(() => console.warn("Could not prepare the recording tab; saved frames are retained"));
});

// Resume an interrupted completion using durable expectations, without timeout-based acceptance.
mutateRecording(() => finishIfReady()).catch(() => console.warn("Recording recovery is available in the extension"));
