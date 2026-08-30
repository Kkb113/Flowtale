setTimeout(() => {
  const monkeyPatchHTML = (window) => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window.Element.prototype, "innerHTML");

    function parseContent(str) {
      const newStr = str.replace(/<!--textfid\/.*?-->/g, "");
      return newStr;
    }

    Object.defineProperty(window.Element.prototype, "innerHTML", {
      set: originalDescriptor.set,
      get() {
        const value = originalDescriptor.get.call(this);
        return parseContent(value);
      }
    });
  };
  (function () {
    monkeyPatchHTML(window);
    const allIframes = document.querySelectorAll("iframe");
    try {
      allIframes.forEach(iframe => {
        monkeyPatchHTML(iframe.contentWindow);
      });
    } catch (err) {
      console.log(err);
    }
  }());
}, 0);
