/**
 * @jest-environment jsdom
 */

import { readFileSync } from "fs";
import { SerNode } from "@fable/common/dist/types";
import { getSearializedDom } from "./doc";

function getDocFor(filename: string) {
  document.documentElement.innerHTML = readFileSync(`test_assets/${filename}`, {
    encoding: "utf8",
  });
}

function isContentEmpty(el: Text): boolean {
  if (!el.textContent) {
    return true;
  }
  let content = el.textContent;
  content = content.replace(/[\s\n]+/g, "");
  return content === "";
}

type Mismatch = {
  type: "attr" | "nodeName" | "text";
  name: string;
  domValue: string | null | undefined;
  serValue: string | null | undefined;
  tagName?: string;
};
function match(el: ChildNode, node: SerNode): Mismatch[] {
  const mismatch: Mismatch[] = [];

  if (el.nodeType === Node.ELEMENT_NODE) {
    const tEl = el as HTMLElement;
    if (tEl.tagName.toLowerCase() !== node.name) {
      mismatch.push({
        type: "nodeName",
        name: "",
        domValue: tEl.tagName,
        serValue: node.name,
      });
    }

    const attrs = tEl.getAttributeNames();
    const serAttrs = { ...node.attrs };
    for (const attr of attrs) {
      const domAttrVal = tEl.getAttribute(attr);
      const serAttrVal = serAttrs[attr];
      if (domAttrVal !== serAttrVal) {
        mismatch.push({
          type: "attr",
          name: attr,
          domValue: domAttrVal,
          serValue: serAttrVal,
          tagName: tEl.tagName,
        });
      } else {
        delete serAttrs[attr];
      }
    }

    const leftOverKeys = Object.keys(serAttrs);
    if (leftOverKeys.length > 0) {
      leftOverKeys.forEach((key) => {
        mismatch.push({
          type: "attr",
          name: key,
          domValue: undefined,
          serValue: serAttrs[key],
          tagName: tEl.tagName,
        });
      });
    }
  } else if (el.nodeType === Node.TEXT_NODE) {
    if (el.textContent !== node.props.textContent) {
      mismatch.push({
        type: "text",
        name: "textContent",
        domValue: el.textContent,
        serValue: node.props.textContent,
      });
    }
  }
  return mismatch;
}

describe("DOM Serializtion", () => {
  it("should serialize a simple doc with no asset and iframe", () => {
    getDocFor("simple.html");
    const sFrame = getSearializedDom({
      frameId: null
    }, { doc: document });

    expect(sFrame.frameUrl).toBe("test://case");
    expect(sFrame.userAgent).toContain("jsdom");
    expect(sFrame.name).toContain("");

    const sDoc = JSON.parse(sFrame.docTreeStr);

    (function checkForMismatch(domEl: ChildNode, serEl: SerNode) {
      const mismatched = match(domEl, serEl);
      expect(mismatched).toEqual([]);

      for (let i = 0, ii = 0; i < domEl.childNodes.length; i++) {
        const el = domEl.childNodes[i];
        if (el.nodeType === Node.TEXT_NODE && isContentEmpty(el as Text)) {
          continue;
        }
        checkForMismatch(domEl.childNodes[i], serEl.chldrn[ii++]);
      }
    }(document.documentElement, sDoc));
  });
});
