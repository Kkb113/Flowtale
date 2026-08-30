import { hexToRGB } from "@fable/common/dist/utils";
import { DEFAULT_BORDER_RADIUS } from "@fable/common/dist/types";

export const FABLE_DONT_SER_CLASSNAME = "fable-dont-ser";
/**
 * If the app being recorded is heavy with a lot of elements,
 * batching of 5 screens together was also exceeding the limit.
 * For this reason, batch size is now reduced to 1
 */
export const BATCH_SIZE = 1;

export function getRandomId(): string {
  return Math.random().toString(16).substring(2, 15) + Math.random().toString(16).substring(2, 15);
}

export function isCrossOrigin(url1: string, url2: string): boolean {
  if (!url1 || !url2) {
    // If a frame has no src defined then also we say it's from the same origin
    return false;
  }

  if (url1.startsWith("/") || url2.startsWith("/")) {
    // both are relative url
    return false;
  }

  if (url1.trim().toLowerCase() === "about:blank" || url2.trim().toLowerCase() === "about:blank") {
    return false;
  }

  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);

    return u1.protocol !== u2.protocol || u1.host !== u2.host;
  } catch (e) {
    setTimeout(() => {
      // throw error in next frame
      throw e;
    }, 0);
    return false;
  }
}

export function getCookieHeaderForUrl(cookies: chrome.cookies.Cookie[], pageUrl: URL): String {
  const host = pageUrl.host;
  const path = pageUrl.pathname;
  const hostParts = host.split(".");
  const allSubDomains: Record<string, number> = {};

  let cumulativeSubDomain = `.${hostParts[hostParts.length - 1]}`;
  for (let i = hostParts.length - 2; i >= 0; i--) {
    cumulativeSubDomain = `${i > 0 ? "." : ""}${hostParts[i]}${cumulativeSubDomain}`;
    allSubDomains[cumulativeSubDomain] = 1;
  }

  return cookies
    .filter((cookie) => cookie.domain in allSubDomains && path.startsWith(cookie.path || "/"))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export function getAbsoluteUrl(urlStr: string, baseUrl: string) {
  try {
    const url = new URL(urlStr);
    return url.href;
  } catch {
    const first2CharOfUrl = urlStr.substring(0, 2);
    if (first2CharOfUrl === "//") {
      // https://stackoverflow.com/a/9646435/2474269
      return new URL(baseUrl).protocol + urlStr;
    }
    if (first2CharOfUrl.charAt(0) === "/") {
      return new URL(baseUrl).origin + urlStr;
    }
    return baseUrl + urlStr;
  }
}

export function isCaseInsensitiveEqual(str1: string | null | undefined, str2: string | null | undefined): boolean {
  return !!(str1 && str2 && str1.toLowerCase() === str2.toLowerCase());
}

export function isContentEmpty(el: Text): boolean {
  if (!el.textContent) {
    return true;
  }
  let content = el.textContent;
  content = content.replace(/[\s\n]+/g, "");
  return content === "";
}

export function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return !(style.visibility === "hidden" || style.display === "none");
}

export const hslToHex = (hsl: string) : string => {
  const hslValues = hsl.match(/\d+/g);
  const h = parseInt(hslValues![0], 10);
  const s = parseInt(hslValues![1], 10) / 100;
  const l = parseInt(hslValues![2], 10) / 100;
  let r; let g; let
    b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const standardizeHex = (hex: string) : string => {
  const one = hex[1];
  const two = hex[2];
  const three = hex[3];
  return hex.length === 7 ? hex : `#${one}${one}${two}${two}${three}${three}`;
};

export function isShadeOfWhiteOrBlack(hexColor: string): boolean {
  const rgbColor = hexToRGB(hexColor);

  const grayThreshold = 30;

  const isGray = Math.abs(rgbColor.red - rgbColor.green) < grayThreshold
  && Math.abs(rgbColor.green - rgbColor.blue) < grayThreshold
  && Math.abs(rgbColor.blue - rgbColor.red) < grayThreshold;

  const whiteThreshold = 240;
  const blackThreshold = 15;

  return ((rgbColor.red >= whiteThreshold && rgbColor.blue >= whiteThreshold && rgbColor.blue >= whiteThreshold)
  || (rgbColor.red <= blackThreshold && rgbColor.green <= blackThreshold && rgbColor.blue <= blackThreshold)
  || isGray);
}

export function getNormalizedBorderRadius(borderRadiusStr: string): number {
  const match = borderRadiusStr.match(/^\d+/);
  if (match && !Number.isNaN(+match[0])) {
    const br = +match[0];
    if (br < DEFAULT_BORDER_RADIUS) return DEFAULT_BORDER_RADIUS;
    return br;
  }
  return DEFAULT_BORDER_RADIUS;
}

export function sanitizeUrlsInCssStr(urls: string[]) {
  return urls
    .map(match => match.replace(/url\("(.*?)"\)|url\('(.*?)'\)|url\((.*?)\)/, "$1$2$3"));
}

export const blobToDataUrl = (
  node: SVGImageElement | HTMLImageElement,
  width: number,
  height: number
) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx!.drawImage(node, 0, 0);
  const dataURL = canvas.toDataURL("image/png");
  const base64 = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
  canvas.remove();

  return base64;
};

export const createShadowDOM = (
  hostId: string,
  innerHTML: string
): { hostCon: HTMLElement; shadowRoot: ShadowRoot } => {
  const hostCon = document.createElement("div");
  hostCon.setAttribute("id", hostId);

  const shadowRoot = hostCon.attachShadow({
    mode: "open",
  });
  shadowRoot.innerHTML = innerHTML;

  hostCon.classList.add(FABLE_DONT_SER_CLASSNAME);
  shadowRoot.querySelectorAll("*").forEach((el) => {
    el.classList.add(FABLE_DONT_SER_CLASSNAME);
  });

  return { hostCon, shadowRoot };
};
