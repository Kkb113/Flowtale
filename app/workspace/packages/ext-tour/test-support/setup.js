if (typeof Document !== "undefined") {
  Object.defineProperty(Document.prototype, "adoptedStyleSheets", {
    configurable: true,
    get: () => [],
  });
}
