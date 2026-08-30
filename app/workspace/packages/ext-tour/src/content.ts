import { getRandomId, sleep, snowflake } from "@fable/common/dist/utils";
import { init as sentryInit } from "@fable/common/dist/sentry";
import raiseDeferredError from "@fable/common/dist/deferred-error";
import { nanoid } from "nanoid";
import { RectWithFId } from "@fable/common/dist/types";
import { Msg, MsgPayload } from "./msg";
import { addFableIdsToAllEls, getScreenStyle, getSearializedDom } from "./doc";
import {
  ReqScreenshotData,
  ScreenSerDataFromCS,
  ScreenSerStartData,
  ScriptInitReportedData,
  ScriptInitRequiredData,
  SerializeFrameData,
  StopRecordingData
} from "./types";
import { FABLE_DONT_SER_CLASSNAME } from "./utils";
import { version } from "../package.json";
import { CountDownModal } from "./components/countdown-modal";
import { ExtensionInfoModal } from "./components/extension-info-modal";

sentryInit("extension", version);

const FABLE_MSG_LISTENER_DIV_ID = "fable-0-cm-presence";
const FABLE_DOM_EVT_LISTENER_DIV = "fable-0-de-presence";
const FABLE_ID_ID = "fable-0-id-id";
const FABLE_MSG_FROM_IDENTIFIER = "sharefable.com";

const isDocHtml4P1 = (el: Node): boolean => {
  const res = !!((el.nodeName || "").toLowerCase() === "html"
    && el.parentNode
    && (el.parentNode.nodeName || "").toLowerCase() === "#document"
    && (el.parentNode.childNodes[0] || { nodeType: -1 }).nodeType !== 10);

  return res;
};

const calculatePathFromEl = (el: Node, loc: number[]): number[] => {
  if (el.nodeName === "#document") {
    const tEl = el as Document;
    if (tEl.defaultView && tEl.defaultView.frameElement) {
      return calculatePathFromEl(tEl.defaultView.frameElement, loc);
    }
    return loc.reverse();
  }
  const siblings: Array<ChildNode | ShadowRoot> = Array.from(el.parentNode!.childNodes);
  if (el.parentNode!.nodeType === Node.ELEMENT_NODE && (el.parentNode! as HTMLElement).shadowRoot) {
    siblings.unshift((el.parentNode! as HTMLElement).shadowRoot!);
  }
  for (let i = 0, l = siblings.length; i < l; i++) {
    if (el === siblings[i]) {
      // For html5 documents the first element is doctype, and for html4.1 documents the doctype is not present, first
      // element is html element
      // [a] -> However during ser-deser we add an extra element of node type 10 irrespective of html5 or html4.1 documents to
      // have a consistent behaviour across both document type.
      // But while resolving the path of click from the original document, for html4.1 document we calculate the path
      // erronously if we don't adjust the path for behaviour [a]. Hence we update the path here
      if (isDocHtml4P1(el)) loc.push(i + 1);
      else loc.push(i);
      return calculatePathFromEl(el.parentNode!, loc);
    }
  }
  return loc;
};

const calculatePathFromElInsideShadowDom = (el: Node, loc: number[]): number[] => {
  if (el.nodeName === "#document") {
    const tEl = el as Document;
    if (tEl.defaultView && tEl.defaultView.frameElement) {
      return calculatePathFromElInsideShadowDom(tEl.defaultView.frameElement, loc);
    }
    return loc.reverse();
  }

  let parent = el.parentNode;
  const siblings : (ChildNode | ShadowRoot)[] = Array.from(parent!.childNodes);
  if ((parent as HTMLElement).shadowRoot) {
    siblings.unshift((parent as HTMLElement).shadowRoot!);
  }

  for (let i = 0, l = siblings.length; i < l; i++) {
    if (el === siblings[i]) {
      if (isDocHtml4P1(el)) loc.push(i + 1);
      else loc.push(i);
      if (parent!.nodeName === "#document-fragment") {
        parent = (parent as ShadowRoot).host;
        loc.push(0);
        return calculatePathFromElInsideShadowDom(parent!, loc);
      }
      return calculatePathFromElInsideShadowDom(parent!, loc);
    }
  }
  return loc;
};

function serialize(
  isSource: boolean,
  id: number,
  els: {
    targetEl: HTMLElement,
    candidates: HTMLElement[]
  } | null | undefined = undefined, // el = null when the click is for a cover annotation
  isInsideShadowDom: boolean = false
) {
  chrome.runtime.sendMessage<MsgPayload<ScreenSerStartData>>({
    type: Msg.FRAME_SERIALIZATION_START,
    data: {
      eventType: isSource ? "source" : "cascade",
      id,
    }
  });

  chrome.runtime.sendMessage<MsgPayload<ReqScreenshotData>>({
    type: Msg.TAKE_SCREENSHOT,
    data: { id }
  });

  addFableIdsToAllEls();
  let elPath;
  const el = els?.targetEl;
  if (el) {
    if (isInsideShadowDom) {
      elPath = calculatePathFromElInsideShadowDom(el as Node, []).join(".");
    } else {
      elPath = calculatePathFromEl(el as Node, []).join(".");
    }
  } else if (el === null) elPath = "$";

  const fablePresenceDiv = document.getElementById(FABLE_DOM_EVT_LISTENER_DIV);
  const frameId = fablePresenceDiv?.getAttribute(FABLE_ID_ID) || null;

  const serDoc = getSearializedDom({ frameId });
  const screenStyle = getScreenStyle();
  elPath && serDoc.postProcesses.push({ type: "elpath", path: elPath });

  // TODO
  // interactionCtx is used for creating images with marks on the page for llm to use.
  // el is the element that was clicked on to create the screenshot. This el might be adjusted based on hueiristic
  // Along side el, we calculate the candidates that might be used for llm to create the annotaiton properly with more
  // context.
  // Although drawing the boundbox of the clicked el might sound trivial, it might get very complicated for
  // nested cross origin or same origin iframes or iframes inside shadow dom.
  //
  // Since this is more of a POC, we just support click on element in the root frame. If this is working well,
  // then we have to add complete support

  chrome.runtime.sendMessage<MsgPayload<ScreenSerDataFromCS>>({
    type: Msg.FRAME_SERIALIZED,
    data: {
      eventType: isSource ? "source" : "cascade",
      id,
      isLast: el === null,
      serDoc,
      location: document.location.origin,
      screenStyle,
      // this information is only used for drawing marks on the screenshot and discarded there after
      interactionCtx: getInteractionCtxData(els, isInsideShadowDom)
    }
  });
}

function getClientRect(el: HTMLElement): RectWithFId {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    fid: el.getAttribute("f-id") || ""
  };
}

function getInteractionCtxData(els: { targetEl: HTMLElement; candidates: HTMLElement[]; } | null | undefined, isInsideShadowDom: boolean): ScreenSerDataFromCS["interactionCtx"] | null {
  if (!els) return null;
  const { targetEl, candidates } = els;
  return {
    type: "click",
    focusEl: getClientRect(targetEl),
    candidates: candidates.map(getClientRect),
  };
}

// Once the element is selected on screen there might be possiblity that only an inner div got selected.
// In that case we need to find the closest ancestor that has a bounding box of almost similar size
// This guards against the case of drawing selection box that is partly on the choosen element.
function getSelectionCandidate(element: HTMLElement): HTMLElement {
  let el = element;
  let tel = element;
  let prevArea = Infinity;
  let elItr = 10;
  while (el && elItr > 0) {
    elItr--;
    const box = el.getBoundingClientRect();
    const area = box.width * box.height;
    if (!area) continue;
    if (area - prevArea <= 5000) { // 5000 is a magic number. We can tweak this if needed
      tel = el;
      el = el.parentElement as HTMLElement;
      prevArea = area;
    } else break;
  }

  if (tel === document.body) {
    tel = element;
  }

  return tel;
}

// Once an element is selected we adjust the selection as well as get other candidate selection
// in the traversal hierarchy
function adjustElementAndGetCandidates(element: HTMLElement) {
  const el = getSelectionCandidate(element);
  const candidates: HTMLElement[] = [];
  const maxCandidates = 3;
  let i = 0;
  let anchor = el;
  while (i < maxCandidates) {
    if (anchor.parentElement === null) break;
    anchor = anchor.parentElement;
    const candidate = getSelectionCandidate(anchor);
    if (candidate === document.body) break;
    candidates.push(candidate);
    anchor = candidate;
    i++;
  }
  return [el, ...candidates];
}

const onClickHandler = async (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains(FABLE_DONT_SER_CLASSNAME)) return;
  let el = e.target;
  let isInsideShadowDom = false;
  try {
    if ((el as HTMLElement).shadowRoot) {
      el = e.composedPath()[0] || el;
      isInsideShadowDom = true;
    }
  } catch (err) {
    el = e.target;
    raiseDeferredError(err as Error);
  }

  const tEl = el as HTMLElement;
  const [rEl, ...candidates] = adjustElementAndGetCandidates(tEl);
  serialize(true, snowflake(), {
    targetEl: rEl,
    candidates
  }, isInsideShadowDom);
};

function createListenerMarkerDivIfNotPresent(doc: Document) {
  // this div is present once the onClick listener is added to a frame and all same origin frame wrt to the parent frame
  const div = doc.getElementById(FABLE_DOM_EVT_LISTENER_DIV);
  if (div === null) {
    const nDiv = doc.createElement("div");
    nDiv.setAttribute("id", FABLE_DOM_EVT_LISTENER_DIV);
    doc.body.appendChild(nDiv);
    return true;
  }
  return false;
}

function getAllIframesInDoc(type: "crossorigin" | "sameorigin", doc: Document) {
  const iframes = Array.from(doc.querySelectorAll("iframe"));
  const shadowRoots = Array.from(doc.querySelectorAll("*")).map(el => el.shadowRoot).filter(Boolean);
  for (const shadow of shadowRoots) {
    if (shadow) iframes.push(...Array.from(shadow.querySelectorAll("iframe")));
  }
  if (type === "crossorigin") return iframes.filter(frame => !frame.contentDocument);
  return iframes.filter(frame => !!frame.contentDocument);
}

function installMessageListenerInFrame(win: Window, frameId: string) {
  if (!(win && frameId)) return;

  (win as any).__data_fable_frameid__ = frameId;
  let i = 1;
  const timer = setInterval(() => {
    // we will try this 5 times in case the parent frame hasn't been set up when the child frame send the message.
    // This message passing could be called multiple times hence we should always make this function idempotent
    if (i++ > 5) clearTimeout(timer);
    win.parent.postMessage({
      from: FABLE_MSG_FROM_IDENTIFIER,
      type: "idpropagation",
      relay: frameId,
      value: frameId
    }, "*");
  }, 1000);

  win.addEventListener("message", msg => {
    if (msg && msg.data && msg.data.from === FABLE_MSG_FROM_IDENTIFIER) {
      // console.log("[Fable] Interframe listener installation. Trying...");
      if (msg.data.type === "idpropagation") {
        const frames = getAllIframesInDoc("crossorigin", win.document);
        const fs = frames.filter(f => f.contentWindow === msg.source);
        if (fs.length !== 1) {
          console.warn("[Fable] No unique target found. Required 1, recieved ", fs.length, ". id", frameId);
          return;
        }
        fs[0].setAttribute(FABLE_ID_ID, msg.data.value);
      }
    }
  });

  const sameOriginFrames = getAllIframesInDoc("sameorigin", win.document);
  sameOriginFrames.forEach(frame => installMessageListenerInFrame(frame.contentWindow!, frameId));
}

function installMessageListener(frameId: string) {
  const fablePresenceDiv = document.getElementById(FABLE_DOM_EVT_LISTENER_DIV);
  if (!fablePresenceDiv) {
    console.warn("[Fable] Couldn't establish message passing pipes as target el is not found");
    return;
  }
  if (fablePresenceDiv.getAttribute(FABLE_ID_ID) !== null) return; // message passing alrady installed
  fablePresenceDiv.setAttribute(FABLE_ID_ID, frameId);
  installMessageListenerInFrame(window, frameId);
}

function installListener(doc: Document) {
  const isCreatedNew = createListenerMarkerDivIfNotPresent(doc);
  if (isCreatedNew) {
    doc.addEventListener("mousedown", onClickHandler, true);
    // Checks if an iframe is added dynamically, if yes then onload of all those frames we rerun the installListener
    // to add listeners to frames that are not listened to.
    const observer = new MutationObserver(async mutations => {
      const frames: HTMLIFrameElement[] = [];
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeName && (node.nodeName.toLowerCase() === "iframe" || node.nodeName.toLowerCase() === "object")) {
              frames.push(node as HTMLIFrameElement);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const iframes = (node as HTMLElement).querySelectorAll("iframe");
              iframes.forEach(frame => frames.push(frame as HTMLIFrameElement));
            }
          }
        }
      }
      if (frames.length > 0) {
        await Promise.race([
          Promise.all(
            frames.map(f => new Promise(resolve => {
              f.onload = resolve;
            }))
          ),
          // In case the onload is already fired on the mounted frames, then f.onload won't be fired,
          // we use a timeout of 3s before we say the frame is loaded or not
          // to w
          sleep(3000),
        ]);

        const crossOriginFrameOccurances = frames
          .map(f => f.contentDocument)
          .filter(d => !d)
          .length;

        if (crossOriginFrameOccurances) {
          chrome.runtime.sendMessage<MsgPayload<{}>>({
            type: Msg.REINJECT_CONTENT_SCRIPT,
            data: { }
          });
        }

        installListener(doc);
      }
    });
    observer.observe(doc, {
      subtree: true,
      childList: true
    });
  }
  const iframes = [
    ...Array.from(doc.getElementsByTagName("iframe")),
    ...Array.from(doc.getElementsByTagName("object")),
  ];
  const sameOriginDocs = iframes
    .map(frame => {
      // Sometime this code can run when a frame is still loading, we run the installListener once more once the frame
      // loading is completed. Practically during dev/testing we did not see this code getting executed, but logically,
      // this code is added to guard against such cases. Google-analytics sometime behave weirdly where a listener
      // won't get registered to the galaxyIFrame. After we added this code we did not notice that behaviour.
      frame.onload = () => {
        installListener(doc);
      };
      return frame.contentDocument;
    })
    .filter(d => !!d);

  if (iframes.length !== sameOriginDocs.length) {
    chrome.runtime.sendMessage<MsgPayload<{}>>({
      type: Msg.REINJECT_CONTENT_SCRIPT,
      data: { }
    });
  }

  for (const d of sameOriginDocs) {
    try {
      installListener(d!);
      installMessageListenerInFrame(d!.defaultView!, (doc.defaultView as any).__data_fable_frameid__);
    } catch (e) {
      console.error("Error installing msg listeners", e);
    }
  }
}

// this function is injected in the top of the frame. All the same-origin frame access the same function that
// sits on top of the frame
function init() {
  const initData: ScriptInitReportedData = {
    scriptId: getRandomId(),
    frameId: -1
  };

  installListener(document);

  const onMessageReceiveFromBackground = async (msg: MsgPayload<any>) => {
    switch (msg.type) {
      case Msg.SCRIPT_INIT_DATA: {
        const tMsg = msg as MsgPayload<ScriptInitReportedData>;
        // Since one tab could have many frames, and while sending message from background page
        // chrome has no way to target a frame, this check essentially allows message meant for
        // a frame reaches the specific frame, not all the other frames
        if (tMsg.data.scriptId === initData.scriptId) {
          initData.frameId = tMsg.data.frameId;
          try {
            installMessageListener(`fi-${nanoid()}`);
          } catch (e) {
            console.error("Error installing msg listeners", e);
          }
        }
        break;
      }

      case Msg.SHOW_COUNTDOWN_MODAL: {
        const isRootFrame = window === window.parent;
        if (isRootFrame) {
          const countDownModal = new CountDownModal(() => {
            const extensionInfoModal = new ExtensionInfoModal();
          });
        }
        break;
      }

      case Msg.SERIALIZE_FRAME: {
        const tMsg = msg as MsgPayload<SerializeFrameData>;
        if (tMsg.data.srcFrameId !== initData.frameId) {
          serialize(false, tMsg.data.id);
        }
        break;
      }

      case Msg.STOP_RECORDING: {
        const tMsg = msg as MsgPayload<StopRecordingData>;
        serialize(false, tMsg.data.id, null);
        break;
      }

      default:
        break;
    }
  };

  chrome.runtime.onMessage.addListener(onMessageReceiveFromBackground);
  chrome.runtime.sendMessage<MsgPayload<ScriptInitRequiredData>>({
    type: Msg.SCRIPT_INIT,
    data: { required: "frameId", scriptId: initData.scriptId }
  });
}

// Presence of this div detects if the messaging with the background script has been
// established by a frame in a tab
function createFableZeroPx() {
  const div = document.createElement("div");
  div.setAttribute("id", FABLE_MSG_LISTENER_DIV_ID);
  document.body.appendChild(div);
}

// This is a guard against content script getting called multiple time when tab gets re-loaded
// or even url change
if (document.getElementById(FABLE_MSG_LISTENER_DIV_ID) == null) {
  createFableZeroPx();
  init();
}

export { };
