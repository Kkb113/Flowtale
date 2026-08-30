import { SerNode } from '@fable/common/dist/types';
import { nanoid } from 'nanoid';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { getUrlsFromSrcset } from '@fable/common/dist/utils';
import { captureException } from '@sentry/react';
import { DeSerProps } from '../preview';
import { addPointerEventsAutoToEl, isHTTPS } from '../../../utils';

export const FABLE_CUSTOM_NODE = -1;

export function purifySrcDoc(htmlStr: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    let doctype = '';
    if (doc.doctype) {
      doctype = `<!DOCTYPE ${doc.doctype.name}>`;
    }

    // Serialize the cleaned DOM back to a string, including the DOCTYPE
    const cleanedHtmlString = `${doctype}\n${doc.documentElement.outerHTML}`;
    return cleanedHtmlString;
  } catch (e) {
    captureException(e);
    return htmlStr;
  }
}

export const deser = (
  serNode: SerNode,
  doc: Document,
  version: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
  nestedFrames: HTMLIFrameElement[],
  props: DeSerProps = { partOfSvgEl: 0, shadowParent: null },
  shouldAddImgToAssetLoadingPromises: boolean = false,

): Node | null | undefined => {
  const newProps: DeSerProps = {
    // For svg and all the child nodes of svg set a flag
    partOfSvgEl: props.partOfSvgEl | (serNode.name === 'svg' ? 1 : 0),
    shadowParent: props.shadowParent,
  };

  let node;
  switch (serNode.type) {
    case Node.TEXT_NODE:
      node = doc.createTextNode(serNode.props.textContent!);
      break;
    case Node.ELEMENT_NODE:
      if (serNode.name === 'meta') {
        node = doc.createComment(`metafid/${serNode.attrs['f-id']}`);
      } else {
        try {
          node = createHtmlElement(
            serNode,
            doc,
            version,
            newProps,
            assetLoadingPromises,
            shouldAddImgToAssetLoadingPromises
          );
          newProps.shadowParent = (node as HTMLElement).shadowRoot;
          if (node.nodeName.toLowerCase() === 'body') {
            deserCustomCssStyleSheets(serNode, doc, node);
          }

          try {
            if (serNode.name.toLowerCase().includes('-')) {
              class CustomElement extends doc.defaultView!.HTMLElement {

              }
              doc.defaultView!.customElements.define(serNode.name.toLowerCase(), CustomElement);
            }
          } catch (err) {
            /* noop */
            // console.warn(serNode.name, 'not custom? anyway', err);
            // every try catch block takes up execution time. Right now we simply ignore if there are exceptions. In
            // future handle common exceptions like if custom element registry already have a custom element then
            // do not redeclare it
          }
        } catch (e) {
          raiseDeferredError(e as Error);
        }
      }
      break;

    case Node.COMMENT_NODE: {
      let commentText = serNode.props.textContent;
      if (!commentText || serNode.name !== '#comment') {
        commentText = `elfid/${serNode.attrs['f-id']}`;
      }
      node = doc.createComment(commentText);
      break;
    }

    case Node.DOCUMENT_FRAGMENT_NODE:
      node = newProps.shadowParent;
      deserCustomCssStyleSheets(serNode, doc, node!);
      break;

    case FABLE_CUSTOM_NODE: {
      try {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = serNode.props.content!;
        node = wrapper.children[0];
        node.setAttribute('f-id', serNode.attrs['f-id'] || nanoid());
      } catch (err) {
        raiseDeferredError(err as Error);
        break;
      }
      break;
    }

    default:
      break;
  }

  if (!serNode.props.isHidden && !(serNode.name === 'iframe' || serNode.name === 'object')) {
    for (const child of serNode.chldrn) {
      const childNode = deser(
        child,
        doc,
        version,
        frameLoadingPromises,
        assetLoadingPromises,
        nestedFrames,
        newProps,
        shouldAddImgToAssetLoadingPromises,
      );
      if (childNode && node && !child.props.isShadowRoot) {
        node.appendChild(childNode);
        if (child.name === 'iframe' || child.name === 'object') {
          const tNode = childNode as HTMLIFrameElement;
          // WARN[#doctypenode]
          // Mostly new html5 document would have <!doctype html><html>...</html> tag
          // older html document would not have <!doctype html> it might have transitional header or might not have
          // anything at all.
          // <!dotype html> is called DOCUMENT_TYPE_NODE
          // While serializaiton we carefully parse the dom and see if DOCUMENT_TYPE_NODE node is present or not.
          // If present, we add it in serializaiton logic.
          // However during deserialization we don't check DOCUMENT_TYPE_NODE's existence.
          // This might create issues for older document where DOCUMENT_TYPE_NODE is not present but deserialization
          // assumes document type node is present. ElPath might not match as well.
          const htmlNode = child.chldrn.find(n => n.type === Node.ELEMENT_NODE && n.name === 'html');
          if (htmlNode) {
            const p = new Promise(resolve => {
              tNode.onabort = () => {
                console.error('Iframe loading aborted');
                resolve(1);
              };
              tNode.onerror = () => {
                console.error('Iframe loading failed');
                resolve(1);
              };

              tNode.onload = () => {
                const newDoc = tNode.contentDocument!;
                deserFrame(htmlNode, newDoc, version, frameLoadingPromises, assetLoadingPromises, nestedFrames);
                nestedFrames.push(tNode);
                resolve(1);
              };
            });
            frameLoadingPromises.push(p);
          } else {
            // console.warn('Iframe nodes are not as expected', child.chldrn);
          }
        } else if (serNode.name === 'select') {
          // For select node the value property need to be set after the child is attached
          for (const [nodePropKey, nodePropValue] of Object.entries(serNode.props.nodeProps || {})) {
            (node as any)[nodePropKey] = nodePropValue;
          }
        }
      }
    }
  } else {
    // if it's iframe, the previous iteration wold call deserFrame.
    // Iframe's contentDocument is available after it's attached to body and is loaded
  }
  return node;
};

function shouldReplaceSrcset(urlStrs: string): boolean {
  try {
    const urls = getUrlsFromSrcset(urlStrs);
    for (const urlStr of urls) {
      const url = new URL(urlStr);
      // We are checking if an url has been successfully proxied by fable
      if (url.host !== process.env.REACT_APP_DATA_CDN!) {
        return true;
      }
    }
    return false;
  } catch (e) {
    raiseDeferredError(e as Error);
    return true;
  }
}

// TODO this method has some basic room for performance improvements. This code sits in hotpath of rendering so if
// performance improvement is necessary at somepoint this function should be a primary candidate.
export const createHtmlElement = (
  node: SerNode,
  doc: Document,
  version: string,
  props: DeSerProps,
  assetLoadingPromises: Promise<unknown>[],
  shouldAddImgToAssetLoadingPromises: boolean,
): Node => {
  const el = props.partOfSvgEl
    ? doc.createElementNS('http://www.w3.org/2000/svg', node.name)
    : doc.createElement(node.name);

  if (node.name === 'canvas') {
    const element = el as HTMLCanvasElement;
    element.width = +(node.attrs.width ?? 0);
    element.height = +(node.attrs.height ?? 0);
    const ctx = element.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, +node.attrs.width!, +node.attrs.height!);

      const img = document.createElement('img');
      img.src = node.attrs.src!;

      img.onload = () => {
        ctx.drawImage(img, 0, 0, +node.attrs.width!, +node.attrs.height!);
        img.onload = null;
      };
    }
  }

  if (node.name === 'form') {
    el.addEventListener('submit', stopEventBehaviour);
  } else if (node.name === 'input') {
    el.addEventListener('click', stopEventBehaviour);
  }

  for (const [nodePropKey, nodePropValue] of Object.entries(node.props.nodeProps || {})) {
    if (node.name === 'input' && node.attrs.type === 'file' && nodePropKey === 'value') {
      (el as any)[nodePropKey] = '';
      continue;
    }
    if (node.name === 'input' && node.attrs.type === 'text'
      && nodePropKey === 'value' && (nodePropValue as string).length !== 0) {
      (el as HTMLInputElement).setAttribute('value', nodePropValue as string);
      continue;
    }
    (el as any)[nodePropKey] = nodePropValue;
  }

  let attrKey;
  let attrValue;
  /**
   * For integrity:
   // Since we proxy assets, the css files sometimes are edited with proxied url;
   // hence the integrity attribute might throw error https://stackoverflow.com/a/34429101
   * For dxdy & cdxdy:
   // We tried recording a fable's screen editor demo with amplitude's screen,
   // the iframes had a dxdy applied to it already
   // but after we record a demo of it, we will need to recalculate all those dxdy, for that we are skipping the attrs
   // Ref: https://sharefable.slack.com/archives/C0491PEEPPZ/p1715333327007159
   */
  const attrsToSkip = ['integrity', 'dxdy', 'cdxdy'];
  for ([attrKey, attrValue] of Object.entries(node.attrs)) {
    try {
      if (attrsToSkip.includes(attrKey.toLowerCase())) continue;
      if (node.name === 'iframe' && attrKey === 'loading') continue;
      /*
       * <iframe> <- a
       *    <html>
       *     <head>...</head>
       *     <body>
       *       ...
       *       <iframe name='body'> <- b
       *     </body
       * </iframe>
       * In the above case, if a nested iframe (`b`) has a name property with value body and if we run
       * a.contentDocument.body from the parent frame of a then instead of getting a frame's body, we get window object
       * of `b`. Hence if we encounter such case, we change the iframe name to body-normalied.
       * If we were to keep the name same then we need to get body of frame `a` from reference of `a` by doing
       * a.contentDocument.getElementsByTagName('body')[0]. If we do this then there are lot of changes we have to do in the codebase.
       * Hence this change was done from a centralized area.
       */
      if (node.name === 'iframe' && attrKey === 'name' && attrValue === 'body') attrValue += '-normalized';
      if (node.name === 'iframe' && attrKey === 'src') {
        const isHTML5 = node.chldrn.find(child => child.type === Node.DOCUMENT_TYPE_NODE);
        if (isHTML5) {
          attrValue = `/aboutblankhtml5.html?ts=${+new Date()}`;
        } else {
          attrValue = `/aboutblankhtml4.html?ts=${+new Date()}`;
        }
        el.setAttribute(attrKey, attrValue);
      } else if (node.name === 'iframe' && (attrKey === 'sandbox' || attrKey === 'allow')) {
        continue;
      } else if (node.name === 'iframe' && attrKey === 'srcdoc') {
        if (!((attrValue || '').trim())) {
          continue;
        }
        // Sometimes srcdoc might have script tag that brings additional script to the page
        // We delete all script tags from inside srcdoc
        const nAttrValue = purifySrcDoc(attrValue as string);
        node.attrs[attrKey] = attrValue = nAttrValue;
        el.setAttribute(attrKey, attrValue);
      } else if (node.name === 'object' && attrKey === 'data') {
        el.setAttribute(attrKey, '/aboutblankhtml5.html');
      } else {
        if (node.name === 'a') {
          if (attrKey === 'href') {
            // eslint-disable-next-line no-script-url
            attrValue = 'javascript:;';
          } else if (attrKey === 'target') continue;
        }
        // HOTFIX!
        if (attrKey === 'xlink:href') {
          el.setAttribute('href', attrValue === null ? 'true' : attrValue);
        }
        el.setAttribute(attrKey, attrValue === null ? 'true' : attrValue);
      }
    } catch (e) {
      // console.info(`[Stage=Deser] can't set attr key=${attrKey} value=${attrValue}`);
    }
  }

  switch (version) {
    case '2023-07-27':
    case '2023-01-10':
      if (node.name === 'style' && node.props.cssRules) el.textContent = node.props.cssRules;
      break;
    default:
      if (node.name === 'style') {
        el.textContent = node.attrs.cssRules;
      }
  }

  if (node.props.isStylesheet) {
    if (node.attrs.href) {
      addToAssetLoadingPromises(el as HTMLLinkElement);
    } else {
      console.warn('No href present for style node', node);
    }
  }

  if (node.name.toLowerCase() === 'img') {
    el.setAttribute('loading', 'eager');
  }

  if (node.name.toLowerCase() === 'img' && shouldAddImgToAssetLoadingPromises) {
    addToAssetLoadingPromises(el as HTMLImageElement);
  }

  if (node.name.toLowerCase() === 'img' && node.attrs.srcset && node.attrs.src && !node.attrs.src.startsWith('blob:')) {
    // WARN: If we find urls in srcset that are not proxied by fable, we replace srcset with src
    const replace = shouldReplaceSrcset(node.attrs.srcset);
    if (replace) el.setAttribute('srcset', `${node.attrs.src}`);
  }
  if (node.props.isShadowHost && !el.shadowRoot) {
    el.attachShadow({ mode: 'open' });
  }

  if (node.name.toLowerCase() === 'body') {
    addPointerEventsAutoToEl(el as HTMLBodyElement);
  }

  function addToAssetLoadingPromises(element: HTMLLinkElement | HTMLImageElement): void {
    const p = new Promise((resolve) => {
      // on either cases we resolve the promises so that the rendering happens
      element.onload = resolve;
      element.onerror = resolve;
      element.onabort = resolve;
    });
    assetLoadingPromises.push(p);
  }

  return el;
};

export const deserFrame = async (
  docTree: SerNode,
  doc: Document,
  v: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
  nestedFrames: HTMLIFrameElement[],
  shouldAddImgToAssetLoadingPromises: boolean = false,
): Promise<void> => {
  const rootHTMLEl = deser(
    docTree,
    doc,
    v,
    frameLoadingPromises,
    assetLoadingPromises,
    nestedFrames,
    { partOfSvgEl: 0, shadowParent: null },
    shouldAddImgToAssetLoadingPromises
  ) as HTMLElement;
  const childNodes = doc.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    if (((childNodes[i] as any).tagName || '').toLowerCase() === 'html') {
      doc.replaceChild(rootHTMLEl, childNodes[i]);
      break;
    }
  }
};

export const deserIframeEl = (
  serNode: SerNode,
  doc: Document,
  version: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
  nestedFrames: HTMLIFrameElement[] = [],
  props: DeSerProps = { partOfSvgEl: 0, shadowParent: null },
  shouldAddImgToAssetLoadingPromises: boolean = false,
): Node => {
  const iframeEl = deser(
    serNode,
    doc,
    version,
    frameLoadingPromises,
    assetLoadingPromises,
    nestedFrames,
    props,
    shouldAddImgToAssetLoadingPromises
  );
  const tNode = iframeEl as HTMLIFrameElement;

  const htmlNode = serNode.chldrn.find(n => n.type === Node.ELEMENT_NODE && n.name === 'html');
  if (htmlNode) {
    const p = new Promise(resolve => {
      tNode.onabort = () => {
        console.error('Iframe loading aborted');
        resolve(1);
      };
      tNode.onerror = () => {
        console.error('Iframe loading failed');
        resolve(1);
      };

      tNode.onload = () => {
        const newDoc = tNode.contentDocument!;
        deserFrame(htmlNode, newDoc, version, frameLoadingPromises, assetLoadingPromises, nestedFrames);
        nestedFrames.push(tNode);
        resolve(1);
      };
    });
    frameLoadingPromises.push(p);
  }
  return tNode;
};

const stopEventBehaviour = (e: Event): void => {
  e.preventDefault();
  e.stopPropagation();
};

const deserCustomCssStyleSheets = (serNode: SerNode, doc: Document, node: Node): void => {
  if (!serNode.props.adoptedStylesheets?.length) return;

  const docToApplyCustomStyleSheets = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node as ShadowRoot : doc;

  const win = doc.defaultView!;
  const sheets: CSSStyleSheet[] = [];
  serNode.props.adoptedStylesheets.forEach(cssText => {
    const sheet = new win.CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheets.push(sheet);
  });
  docToApplyCustomStyleSheets.adoptedStyleSheets = [...sheets];
};
