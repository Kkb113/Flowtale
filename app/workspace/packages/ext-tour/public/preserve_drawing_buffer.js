setTimeout(() => {
  if (!window.HTMLCanvasElement.prototype.__oldGetContext) {
    window.HTMLCanvasElement.prototype.__oldGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function (type, options) {
      if (type === "webgl" || type === "experimental-webgl" || type === "webgl2") {
        return this.__oldGetContext(type, {
          ...options,
          preserveDrawingBuffer: true
        });
      }
      return this.__oldGetContext(type, options);
    };
  }

  (function () {
    const origDrawImg = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const image = args[0];
      if (image instanceof HTMLImageElement) {
        image.crossOrigin = "anonymous";

        if (!image.complete) {
          image.onload = () => {
            origDrawImg.apply(this, args);
          };
          return;
        }
      }

      origDrawImg.apply(this, args);
    };
  }());
}, 0);
