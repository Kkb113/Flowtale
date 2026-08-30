import {
  DEFAULT_BORDER_RADIUS, PostProcess, SerDoc, SerNode, SerNodeWithPath,
  NODE_NAME,
  ThemeBorderRadiusCandidatePerNode,
  ThemeColorCandidatPerNode
} from "@fable/common/dist/types";
import { nanoid } from "nanoid";
import { rgbToHex, getUrlsFromSrcset } from "@fable/common/dist/utils";
import {
  FABLE_DONT_SER_CLASSNAME,
  isCrossOrigin,
  isContentEmpty,
  isVisible,
  standardizeHex,
  hslToHex,
  isShadeOfWhiteOrBlack,
  getNormalizedBorderRadius,
  sanitizeUrlsInCssStr,
  blobToDataUrl
} from "./utils";

export function getPostProcessType(serNode: SerNode): PostProcess["type"] {
  switch (serNode.name) {
    case "iframe":
      return "iframe";
    case "object":
      return "object";
    case "use":
      return "inline-sprite";
    default:
      return "asset";
  }
}

const IRI_REFERENCED_SVG_ELS = [
  "linearGradient",
  "mask",
  "clipPath",
  "filter",
  "marker",
  "pattern",
  "radialGradient"
];

const SER_DOC_SCHEMA_VERSION = 2;

const URL_MATCHER = /url\("(.*?)"\)|url\('(.*?)'\)|url\((.*?)\)/g;

// TODO ability to blacklist elements from other popular extensions like loom, grammarly etc
//
// TODO We execute the function as part of chrome content script injection.
//      By requirement (of chrome) the function should content self suffient i.e. should not import
//      any module / should not use any functioin from closure. Hence we needed to duplicate the
//      util functions as an inner function.
//      Some of these function definitions exists in utils as well thereby duplicating the same definitions
//      in multiple places.
//      We need to be able to do this via webpack compilation
//      Inner utility functions like isContentEmpty, getRandomId are used in multiple location

/*
 * This function will be used from testcases and from chrome content script exectution context
 * If it's being run from content script execution context then we don't pass the parameters to
 * the function. That's how the function behaves based on the fact the testInjectedParams is passed
 * or not. This makes the module unit testable.
 */

export function getSearializedDom(
  params: {
    frameId: string | null
  },
  testInjectedParams?: {
    doc: Document;
  }
): SerDoc {
  const isTest = !!(testInjectedParams && testInjectedParams.doc);
  const doc: Document = isTest ? testInjectedParams.doc : document;

  const postProcesses: Array<PostProcess> = [];
  const iriReferencedSvgEls: Record<string, string> = {};
  const icons: Array<SerNodeWithPath> = [];

  function getRep(
    node: ChildNode | ShadowRoot,
    origin: string,
    traversalPath: Array<number>,
  ): {
    serNode: SerNode;
    shouldSkip?: boolean;
    isIcon?: boolean;
    postProcess?: boolean;
    isHidden?: boolean;
  } {
    const HEAD_TAGS = {
      head: 1,
      title: 1,
      style: 1,
      base: 1,
      link: 1,
      meta: 1,
      script: 1,
      noscript: 1,
    };

    const ICON_MATCHER = new RegExp("icon", "i");

    const NO_INCLUDE_DOM_EL = {
      script: 1,
      noscript: 1,
      base: 1,
    };

    function calculateScrollTopFactor(el: HTMLElement): number {
      const scrollHeight = el.scrollHeight;
      const scrollTop = el.scrollTop;
      const elClientHeight = el.clientHeight;
      const scrollTopFactor = scrollTop / (scrollHeight - elClientHeight);
      return Number.isNaN(scrollTopFactor) ? 0 : scrollTopFactor;
    }

    function calculateScrollLeftFactor(el: HTMLElement): number {
      const scrollWidth = el.scrollWidth;
      const scrollLeft = el.scrollLeft;
      const elClientWidth = el.clientWidth;
      const scrollLeftFactor = scrollLeft / (scrollWidth - elClientWidth);
      return Number.isNaN(scrollLeftFactor) ? 0 : scrollLeftFactor;
    }

    const sNode: SerNode = {
      type: node.nodeType,
      name: "",
      attrs: {},
      props: {
        proxyUrlMap: {}
      },
      chldrn: [],
      sv: SER_DOC_SCHEMA_VERSION,
    };

    let shouldPostProcess: boolean = false;

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        const tNode = node as HTMLElement;
        sNode.name = tNode instanceof SVGElement ? tNode.tagName : tNode.tagName.toLowerCase();
        if (IRI_REFERENCED_SVG_ELS.includes(sNode.name)) {
          iriReferencedSvgEls[`#${tNode.id}`] = "1";
        }
        const attrNames = tNode.getAttributeNames();
        for (const name of attrNames) {
          const attrValue = tNode.getAttribute(name);
          if (attrValue && name.toLowerCase() === "style") {
            const urls = attrValue.match(URL_MATCHER);
            if (urls) {
              sNode.props.proxyUrlMap.style = sanitizeUrlsInCssStr(urls);
              shouldPostProcess = true;
            }
          }

          if (attrValue && name.toLowerCase() === "srcset") {
            const urls = getUrlsFromSrcset(attrValue);
            if (urls.length) {
              sNode.props.proxyUrlMap.srcset = urls;
              shouldPostProcess = true;
            }
          }

          sNode.attrs[name] = attrValue;
        }

        // ADD SCROLL FACTOR HERE:
        const scrollTopFactor = calculateScrollTopFactor(tNode).toString();
        const scrollLeftFactor = calculateScrollLeftFactor(tNode).toString();
        sNode.attrs["fable-stf"] = scrollTopFactor;
        sNode.attrs["fable-slf"] = scrollLeftFactor;

        if (tNode.shadowRoot) sNode.props.isShadowHost = true;

        break;

      case Node.DOCUMENT_FRAGMENT_NODE:
        sNode.name = "#shadow-root";
        sNode.props.isShadowRoot = true;
        const { cssTexts, allProxyUrls } = getAllAdoptedStylesheets(node as ShadowRoot);
        sNode.props.adoptedStylesheets = cssTexts;

        if (allProxyUrls.length) {
          sNode.props.proxyUrlMap.adoptedStylesheets = sanitizeUrlsInCssStr(allProxyUrls);
          shouldPostProcess = true;
        }
        break;

      case Node.TEXT_NODE:
        sNode.name = node.nodeName;
        sNode.props.textContent = (node as Text).textContent;
        break;

      case Node.COMMENT_NODE:
        sNode.name = node.nodeName;
        sNode.props.textContent = node.nodeValue;
        return { serNode: sNode, shouldSkip: true };

      default:
        console.error("unknown node", node);
        throw new Error("node type could not be parsed");
    }

    if (sNode.name === "body") {
      const { cssTexts, allProxyUrls } = getAllAdoptedStylesheets(node.ownerDocument!);
      sNode.props.adoptedStylesheets = cssTexts;

      if (allProxyUrls.length) {
        sNode.props.proxyUrlMap.adoptedStylesheets = sanitizeUrlsInCssStr(allProxyUrls);
        shouldPostProcess = true;
      }
    }

    if (sNode.name in NO_INCLUDE_DOM_EL) {
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.attrs.class?.includes(FABLE_DONT_SER_CLASSNAME)) {
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.name === "use") {
      let hrefValue: string = "";
      let hrefKey: "href" | "xlink:href" = "href";

      if ("xlink:href" in sNode.attrs) {
        hrefValue = sNode.attrs["xlink:href"]!;
        hrefKey = "xlink:href";
      }

      if ("href" in sNode.attrs) {
        hrefValue = sNode.attrs.href!;
        hrefKey = "href";
      }

      if (hrefValue.startsWith("#")) {
        return { serNode: sNode, postProcess: false };
      }
      const url = new URL(hrefValue, doc.baseURI);

      if (url.hash) {
        const relativesprite = url.pathname + url.search;
        const spriteEl = doc.querySelectorAll(`link[href$="${relativesprite}"]`).item(0);
        const spriteHref = spriteEl && spriteEl.getAttribute("href");

        sNode.props.absoluteUrl = spriteHref ?? undefined;
        sNode.props.spriteId = url.hash;
        sNode.props.isInlineSprite = true;
        sNode.props.proxyUrlMap[hrefKey] = [hrefValue];
        return { serNode: sNode, postProcess: true };
      }
    }

    if (sNode.name === "link") {
      const tNode = node as HTMLLinkElement;
      if (tNode.sheet) {
        sNode.props.proxyUrlMap.href = tNode.sheet.href ? [tNode.sheet.href] : undefined;
        sNode.props.isStylesheet = true;
        return { serNode: sNode, postProcess: true };
      }
      const rel = (tNode.getAttribute("rel") || "").toLowerCase();
      if (ICON_MATCHER.exec(rel) !== null) {
        sNode.props.proxyUrlMap.href = sNode.attrs.href ? [sNode.attrs.href] : undefined;
        return { serNode: sNode, postProcess: true, isIcon: true };
      }
      return { serNode: sNode, shouldSkip: true };
    }

    if (sNode.name === "img") {
      const tNode = node as HTMLImageElement;
      const src = tNode.currentSrc || tNode.src || "";

      let base64: string = "";
      if (src.startsWith("blob:")) {
        base64 = blobToDataUrl(tNode, tNode.width, tNode.height);
      }

      sNode.props.base64Img = base64;
      if (src) {
        sNode.props.proxyUrlMap.src = [src];
        return { serNode: sNode, postProcess: true };
      }
    }

    if (sNode.name === "image") {
      const tNode = node as SVGImageElement;
      const href = tNode.href.baseVal || "";
      const xlinkHref = tNode.getAttribute("xlink:href") || "";

      let hrefBase64: string = "";
      if (href.startsWith("blob:")) {
        hrefBase64 = blobToDataUrl(tNode, tNode.width.baseVal.value, tNode.height.baseVal.value);
      }

      sNode.props.base64Img = hrefBase64;

      if (href && xlinkHref) {
        sNode.props.proxyUrlMap.href = [href];
        sNode.props.proxyUrlMap["xlink:href"] = [xlinkHref];
        return { serNode: sNode, postProcess: true };
      }

      if (href) {
        sNode.props.proxyUrlMap.href = [href];
        return { serNode: sNode, postProcess: true };
      }

      if (xlinkHref) {
        sNode.props.proxyUrlMap["xlink:href"] = [xlinkHref];
        return { serNode: sNode, postProcess: true };
      }
    }

    if (sNode.name === "style") {
      const tNode = node as HTMLStyleElement;
      const { cssText, proxyUrls } = getCSSText(tNode.sheet);
      sNode.props.cssRules = cssText;
      sNode.props.proxyUrlMap.cssRules = sanitizeUrlsInCssStr(proxyUrls);
      return { serNode: sNode, postProcess: Boolean(proxyUrls.length) };
    }

    if (sNode.name === "input") {
      const tNode = node as HTMLInputElement;
      const type = tNode.type;

      if (type === "checkbox" || type === "radio") {
        sNode.props.nodeProps = {
          type,
          checked: tNode.checked,
        };
      } else if (type === "password") {
        sNode.props.nodeProps = {
          type,
          value: "*".repeat(tNode.value.length),
        };
      } else {
        sNode.props.nodeProps = {
          type,
          value: tNode.value,
        };
      }
    }

    if (sNode.name === "select") {
      const tNode = node as HTMLSelectElement;
      sNode.props.nodeProps = {
        value: tNode.value,
      };
    }

    if (sNode.name === "canvas") {
      const tNode = node as HTMLCanvasElement;
      const { width, height } = tNode.getBoundingClientRect();
      const imageData = tNode.toDataURL("image/png");
      sNode.attrs.src = imageData;
      sNode.attrs.width = `${width}`;
      sNode.attrs.height = `${height}`;
      return { serNode: sNode };
    }

    if (sNode.name === "iframe" || sNode.name === "frame" || sNode.name === "object") {
      const tNode = node as HTMLIFrameElement;
      let url = "";
      // Fix: some time iframe won't have src in that case, path calculation during deserialization would not work
      // as iframe.contentDocument.childNodes would not have html5 tag type
      if (sNode.name !== "object") {
        url = sNode.attrs.src || "";
        sNode.attrs.src = sNode.attrs.src || url;
      } else {
        url = sNode.attrs.data || "";
      }
      const rect = tNode.getBoundingClientRect();
      sNode.props.rect = {
        height: rect.height,
        width: rect.width,
      };
      sNode.props.aidxdy = {
        dx: rect.x,
        dy: rect.y
      };

      if (rect.height === 0 || rect.width === 0 || !isVisible(tNode)) {
        // If an iframe is not visible we skip it from DOM. While other element can be hidden and we still
        // save in serialized file as those could contain css or other scripts as a child,
        // we omit the iframe entry since iframe has isolated execution context which makes no sense to have
        // an entry on serialized json.
        return { serNode: sNode, shouldSkip: true };
      }

      if (!isCrossOrigin(origin, url)) {
        try {
          const frameDoc = tNode.contentDocument || tNode.contentWindow?.document;
          if (!frameDoc) {
            setTimeout(() => {
              throw new Error(`Iframe with origin ${url} is same origin but document access is not possible`);
            }, 0);
          } else {
            let idx = 0;
            const chldrn = frameDoc.childNodes;
            for (let i = 0; i < chldrn.length; i++) {
              if (chldrn[i] === frameDoc.documentElement) {
                idx = i;
              } else {
                sNode.chldrn.push({
                  type: chldrn[i].nodeType,
                  name: chldrn[i].nodeName,
                  attrs: {},
                  props: { proxyUrlMap: {} },
                  chldrn: [],
                  sv: SER_DOC_SCHEMA_VERSION,
                });
              }
            }
            traversalPath.push(idx);
            const rep = getRep(frameDoc.documentElement, origin, traversalPath);
            sNode.chldrn.push(rep.serNode);
            traversalPath.pop();
          }

          // WARN[#doctypenode] search with this
          return { serNode: sNode, postProcess: false };
        } catch {
          // Sometimes a frame would have "about:blank" set but then would have a cross-origin
          // <base> set. For those we would find exception on accessing document.
          return { serNode: sNode, postProcess: true };
        }
      }

      return { serNode: sNode, postProcess: true };
    }

    // TODO <audio>, <video>

    const childNodes: Array<ChildNode | ShadowRoot> = Array.from(node.childNodes);
    if ((node as HTMLElement).shadowRoot) {
      childNodes.unshift((node as HTMLElement).shadowRoot!);
    }

    if (childNodes.length) {
      for (let i = 0, ii = 0; i < childNodes.length; i++) {
        traversalPath.push(ii);
        const rep = getRep(childNodes[i], origin, traversalPath);
        const traversalPathStr = traversalPath.join(".");
        traversalPath.pop();
        if (rep.shouldSkip) {
          rep.serNode.type = 8;
        }
        ii++;
        if (rep.postProcess) {
          const postProcess = {} as PostProcess;
          postProcess.type = getPostProcessType(rep.serNode);
          postProcess.path = traversalPathStr;
          postProcesses.push(postProcess);
        }
        if (rep.isIcon) {
          icons.push(Object.assign(rep.serNode, { path: traversalPathStr }));
        }
        sNode.chldrn.push(rep.serNode);
      }
    }

    return { serNode: sNode, postProcess: shouldPostProcess };
  }

  function getViewport(): [w: number, h: number] {
    let viewPortWidth;
    let viewPortHeight;

    if (typeof window.innerWidth !== "undefined") {
      viewPortWidth = window.innerWidth;
      viewPortHeight = window.innerHeight;
    } else if (typeof document.documentElement !== "undefined"
      && typeof document.documentElement.clientWidth
      !== "undefined" && document.documentElement.clientWidth !== 0) {
      viewPortWidth = document.documentElement.clientWidth;
      viewPortHeight = document.documentElement.clientHeight;
    } else {
      viewPortWidth = document.getElementsByTagName("body")[0].clientWidth;
      viewPortHeight = document.getElementsByTagName("body")[0].clientHeight;
    }
    return [viewPortWidth, viewPortHeight];
  }

  const frameUrl = isTest ? "test://case" : document.URL;
  const rep = getRep(doc.documentElement, frameUrl, []);
  const [w, h] = getViewport();

  let candidateIcon: SerNodeWithPath | null = null;
  for (const icon of icons) {
    if (icon.attrs.rel === "icon") {
      candidateIcon = icon;
      break;
    } else if (!candidateIcon && icon.attrs.rel === "shortcut icon") {
      candidateIcon = icon;
    }
  }
  if (candidateIcon === null && icons.length) {
    candidateIcon = icons[0];
  }

  const isHTML5 = Boolean(Array.from(doc.childNodes).find(el => el.nodeType === Node.DOCUMENT_TYPE_NODE));
  return {
    iriReferencedSvgEls,
    frameUrl,
    title: doc.title,
    frameId: params.frameId,
    userAgent: doc.defaultView?.navigator.userAgent || "",
    name: doc.defaultView?.name || "",
    postProcesses,
    // When returning the serialized version of DOM, we stringify the JSON. Otherwise, chrome removes some
    // nested objects in JSON data for some reason.
    docTreeStr: JSON.stringify(rep.serNode),
    rect: {
      width: w,
      height: h,
    },
    icon: candidateIcon,
    baseURI: doc.body.baseURI,
    isHTML5
  };
}

/**
 *
 * Adding fable ids to els
 *
 */
export function addFableIdsToAllEls(
  params?: any,
  testInjectedParams?: {
    doc: Document;
  }
): void {
  const isTest = !!(testInjectedParams && testInjectedParams.doc);
  const doc: Document = isTest ? testInjectedParams.doc : document;

  function getRep(
    node: ChildNode | ShadowRoot,
    origin: string,
    traversalPath: Array<number>,
  ): {
    serNode: SerNode;
    shouldSkip?: boolean;
    isIcon?: boolean;
    postProcess?: boolean;
    isHidden?: boolean;
  } {
    const sNode: SerNode = {
      type: node.nodeType,
      name: "",
      attrs: {},
      props: { proxyUrlMap: {} },
      chldrn: [],
      sv: SER_DOC_SCHEMA_VERSION,
    };

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        const tNode = node as HTMLElement;
        sNode.name = tNode.tagName.toLowerCase();

        if (!tNode.getAttribute("f-id")) {
          tNode.setAttribute("f-id", nanoid());
        }

        if (tNode.shadowRoot) sNode.props.isShadowHost = true;

        break;

      case Node.DOCUMENT_FRAGMENT_NODE:
        sNode.name = "#shadow-root";
        sNode.props.isShadowRoot = true;
        break;

      case Node.TEXT_NODE:
        sNode.name = node.nodeName;

        /**
         * For text node, we add a comment node prev to the text node with fid identified by textfid,
         * There is no way to check if the prev text is the same as the next one,
         * Thus, we remove the text node with textfid if present
         * Then, we add a new comment node prev to the text node
         */
        /**
         *  Style tags behave differently if they have comment nodes inside it
         *  That's why we don't add comments to style nodes
         *  (We replace them instead during the diffs)
         */
        if (node.parentNode?.nodeName.toLowerCase() !== "style") {
          const prev = node.previousSibling;

          const isPrevCommentNode = prev
            && prev.nodeType === Node.COMMENT_NODE
            && prev.nodeValue
            && prev.nodeValue.includes("textfid/");
          let isPrevCommentTextSame = true;

          if (isPrevCommentNode) {
            const fText = prev.nodeValue!.split("==")[1];
            if (fText && fText.split("ftext/")[1] !== node.textContent) {
              isPrevCommentTextSame = false;
              prev.remove();
            }
          }

          if (!isPrevCommentNode || !isPrevCommentTextSame) {
            const comment = doc.createComment(`textfid/${nanoid()}==ftext/${node.textContent}`);
            node.parentNode!.insertBefore(comment, node);
          }
        }
        if (isContentEmpty(node as Text)) {
          return { serNode: sNode, shouldSkip: true };
        }
        sNode.props.textContent = (node as Text).textContent;
        break;

      case Node.COMMENT_NODE:
        const commentNode = node as Comment;
        sNode.name = node.nodeName;
        const next = commentNode.nextSibling;

        // if comment is a textcomment, but there is no text node after it, delete the textcomment
        // this will occur when a text node is deleted, if a text node is deleted we delete its associated comment node
        const isTextComment = commentNode.nodeValue && commentNode.nodeValue?.includes("textfid/");
        const isNextTextNode = next && next.nodeType === Node.TEXT_NODE;
        if (isTextComment && !isNextTextNode) {
          commentNode.remove();
          return { serNode: sNode, shouldSkip: true };
        }

        // if a comment doesn't have fid add it
        // This is for the comments added by the recorded app.
        // To uniquely identify a comment node, we add commentfid to it
        if (!commentNode.nodeValue
          || (!commentNode.nodeValue.includes("commentfid/") && !commentNode.nodeValue.includes("textfid/"))
        ) {
          commentNode.nodeValue = `commentfid/${nanoid()}`;
        }

        return { serNode: sNode, shouldSkip: true };

      default:
        console.error("unknown node", node);
    }

    if (sNode.name === "iframe" || sNode.name === "frame" || sNode.name === "object") {
      const tNode = node as HTMLIFrameElement;
      let url = "";
      // Fix: some time iframe won't have src in that case, path calculation during deserialization would not work
      // as iframe.contentDocument.childNodes would not have html5 tag type
      if (sNode.name !== "object") {
        url = sNode.attrs.src || "";
        sNode.attrs.src = sNode.attrs.src || url;
      } else {
        url = sNode.attrs.data || "";
      }
      const rect = tNode.getBoundingClientRect();
      sNode.props.rect = {
        height: rect.height,
        width: rect.width,
      };
      sNode.props.aidxdy = {
        dx: rect.x,
        dy: rect.y
      };

      if (rect.height === 0 || rect.width === 0 || !isVisible(tNode)) {
        // If an iframe is not visible we skip it from DOM. While other element can be hidden and we still
        // save in serialized file as those could contain css or other scripts as a child,
        // we omit the iframe entry since iframe has isolated execution context which makes no sense to have
        // an entry on serialized json.
        return { serNode: sNode, shouldSkip: true };
      }

      if (!isCrossOrigin(origin, url)) {
        try {
          const frameDoc = tNode.contentDocument || tNode.contentWindow?.document;
          if (!frameDoc) {
            throw new Error(`Iframe with origin ${url} is same origin but document access is not possible`);
          }

          // WARN[#doctypenode] search with this
          let idx = 0;
          const chldrn = frameDoc.childNodes;
          for (let i = 0; i < chldrn.length; i++) {
            if (chldrn[i] === frameDoc.documentElement) {
              idx = i;
            }
          }
          traversalPath.push(idx);
          const rep = getRep(frameDoc.documentElement, origin, traversalPath);
          traversalPath.pop();
          return { serNode: sNode, postProcess: false };
        } catch {
          return { serNode: sNode, postProcess: true };
        }
      }

      return { serNode: sNode, postProcess: true };
    }

    const childNodes: Array<ChildNode | ShadowRoot> = Array.from(node.childNodes);
    if ((node as HTMLElement).shadowRoot) {
      childNodes.unshift((node as HTMLElement).shadowRoot!);
    }

    if (childNodes.length) {
      for (let i = 0, ii = 0; i < childNodes.length; i++) {
        traversalPath.push(ii);
        const rep = getRep(childNodes[i], origin, traversalPath);
        traversalPath.pop();
        ii++;
      }
    }

    return { serNode: sNode };
  }

  const frameUrl = isTest ? "test://case" : document.URL;
  getRep(doc.documentElement, frameUrl, []);
}

export function getScreenStyle(
  params?: any,
  testInjectedParams?: {
    doc: Document;
  }
) {
  const nodeColor: ThemeColorCandidatPerNode = {
    [NODE_NAME.a]: {},
    [NODE_NAME.button]: {},
    [NODE_NAME.div]: {},
  };

  const nodeBorderRadius: ThemeBorderRadiusCandidatePerNode = {
    [NODE_NAME.a]: {
      [DEFAULT_BORDER_RADIUS]: 1
    },
    [NODE_NAME.button]: {
      [DEFAULT_BORDER_RADIUS]: 1
    },
    [NODE_NAME.div]: {
      [DEFAULT_BORDER_RADIUS]: 1
    },
  };

  const isTest = !!(testInjectedParams && testInjectedParams.doc);
  const doc: Document = isTest ? testInjectedParams.doc : document;

  function getRep(node: ChildNode | ShadowRoot): void {
    const tNode = node as HTMLElement;

    if (node.nodeType === Node.ELEMENT_NODE
      && node.nodeName.toLowerCase() in NODE_NAME
      && !tNode.classList.contains(FABLE_DONT_SER_CLASSNAME)) {
      const colorMap = nodeColor[node.nodeName.toLowerCase() as NODE_NAME];
      const borderRadiusForNode = nodeBorderRadius[node.nodeName.toLowerCase() as NODE_NAME];

      const style = getComputedStyle(tNode);

      if (style.backgroundColor) {
        const colorValue = style.backgroundColor;
        const hexValue: string = colorValue.startsWith("rgb")
          ? rgbToHex(colorValue)
          : colorValue.startsWith("hsl")
            ? hslToHex(colorValue)
            : standardizeHex(colorValue);

        if (!isShadeOfWhiteOrBlack(hexValue)) {
          if (hexValue in colorMap) colorMap[hexValue] += 1;
          else colorMap[hexValue] = 1;
        }
      }

      if (style.borderRadius !== "0px") {
        const allBorderRadius: number[] = [];
        allBorderRadius.push(getNormalizedBorderRadius(style.borderTopLeftRadius));
        allBorderRadius.push(getNormalizedBorderRadius(style.borderTopRightRadius));
        allBorderRadius.push(getNormalizedBorderRadius(style.borderBottomLeftRadius));
        allBorderRadius.push(getNormalizedBorderRadius(style.borderBottomRightRadius));

        allBorderRadius.sort((m, n) => n - m);
        let nbr = allBorderRadius[0];

        const box = tNode.getBoundingClientRect();
        if (nbr >= box.width / 2 && nbr >= box.height / 2) {
          // ignore all the border radius that might make a node a perfect circle
          nbr = DEFAULT_BORDER_RADIUS;
        }

        if (nbr > DEFAULT_BORDER_RADIUS) {
          if (nbr in borderRadiusForNode) borderRadiusForNode[nbr] += 1;
          else borderRadiusForNode[nbr] = 1;
        }
      }
    }

    const childNodes: Array<ChildNode | ShadowRoot> = Array.from(node.childNodes);
    if ((node as HTMLElement).shadowRoot) {
      childNodes.push((node as HTMLElement).shadowRoot!);
    }

    if (childNodes.length) {
      for (let i = 0; i < childNodes.length; i++) {
        getRep(childNodes[i]);
      }
    }
  }

  getRep(doc.documentElement);

  return {
    nodeColor,
    nodeBorderRadius
  };
}

function getAllAdoptedStylesheets(currentDoc: Document | ShadowRoot): {cssTexts: string[], allProxyUrls: string[]} {
  const allProxyUrls: string[] = [];
  const cssTexts: string[] = [];
  currentDoc.adoptedStyleSheets.forEach(sheet => {
    const { cssText, proxyUrls } = getCSSText(sheet);
    cssTexts.push(cssText);
    allProxyUrls.push(...proxyUrls);
  });
  return { cssTexts, allProxyUrls };
}

function getCSSText(sheet: CSSStyleSheet | null): {cssText: string, proxyUrls: string[]} {
  const cssRules = sheet?.cssRules ?? [];
  let cssText = "";
  const proxyUrls = [];
  for (let i = 0; i < cssRules.length; i++) {
    const urls = cssRules[i].cssText.match(URL_MATCHER);
    if (urls) proxyUrls.push(...urls);
    cssText += `${cssRules[i].cssText} `;
  }
  return { cssText, proxyUrls };
}
