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
    for (const generatedAttr of ["fable-stf", "fable-slf"]) {
      delete serAttrs[generatedAttr];
    }
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
    expect(sDoc.attrs["fable-stf"]).toBe("0");
    expect(sDoc.attrs["fable-slf"]).toBe("0");

    (function checkForMismatch(domEl: ChildNode, serEl: SerNode) {
      const mismatched = match(domEl, serEl);
      expect(mismatched).toEqual([]);

      if (domEl.nodeName === "STYLE") {
        expect(serEl.props.cssRules).toContain(".hide");
        return;
      }

      expect(serEl.chldrn).toHaveLength(domEl.childNodes.length);
      for (let i = 0; i < domEl.childNodes.length; i++) {
        checkForMismatch(domEl.childNodes[i], serEl.chldrn[i]);
      }
    }(document.documentElement, sDoc));
  });

  it("should inline readable linked stylesheets", () => {
    document.documentElement.innerHTML = `
      <head><link rel="stylesheet" crossorigin href="https://app.test/assets/app.css"></head>
      <body><main class="dashboard">Dashboard</main></body>
    `;
    const link = document.querySelector("link")!;
    Object.defineProperty(link, "sheet", {
      value: {
        href: "https://app.test/assets/app.css",
        cssRules: [{ cssText: ".dashboard { background-image: url('../images/background.png'); display: grid; }" }],
      },
    });

    const sFrame = getSearializedDom({ frameId: null }, { doc: document });
    const sDoc = JSON.parse(sFrame.docTreeStr) as SerNode;
    const head = sDoc.chldrn.find(node => node.name === "head")!;
    const style = head.chldrn.find(node => node.name === "style")!;

    expect(style).toBeDefined();
    expect(style.props.cssRules).toContain("display: grid");
    expect(style.props.cssRules).toContain("https://app.test/images/background.png");
    expect(style.props.proxyUrlMap.cssRules).toEqual(["https://app.test/images/background.png"]);
    expect(style.props.proxyUrlMap.href).toBeUndefined();
  });
});
