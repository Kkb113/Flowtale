interface HTMLDivElementWithData extends HTMLDivElement {
  __width__: number;
}

export default function showLoader(
  el: HTMLElement,
  durationInMS: number,
  showTextFor: number,
  fadeOutFor: number,
  textToDisplay: string,
  ctrl: {
    height: string;
    zIndex: string;
  }
): Promise<void> {
  let resolveFn: () => void;
  const p = new Promise((resolve) => {
    resolveFn = resolve as () => void;
  });

  function createEl() {
    return document.createElement('div') as HTMLDivElementWithData;
  }
  const [container, ylwBar, redBar, prplBar] = Array(4).fill(0).map(createEl);
  container.style.zIndex = ctrl.zIndex;

  el = el || document.body;
  const rect = el.getBoundingClientRect();
  [container, ylwBar, redBar, prplBar].forEach((d, i) => {
    const w = (d.__width__ = rect.width - Math.max(i - 1, 0) * 20);
    d.style.width = `${w}px`;
  });

  [ylwBar, redBar, prplBar].forEach((d) => {
    d.style.transform = `translate(${0}px, 0px)`;
    d.style.position = 'absolute';
  });

  el.appendChild(container);
  [ylwBar, redBar, prplBar].forEach((d) => container.appendChild(d));

  [container, ylwBar, redBar, prplBar].forEach(
    (d) => ((d.style.height = ctrl.height), (d.style.borderRadius = '50px'))
  );

  ylwBar.style.background = '#FEDF64';
  redBar.style.background = '#FF7450';
  prplBar.style.background = '#7567FF';

  const tXs = [ylwBar, redBar, prplBar].map((d) => {
    const offset = d.__width__;
    d.style.transform = `translate(-${offset}px, 0px)`;
    return offset;
  });

  const perlineAnimTime = durationInMS / 3;
  let lastAnimLine = -1;
  let nowAnimLine = 0;
  const lines = [ylwBar, redBar, prplBar];

  let startTime: number;
  // phase 1: draw the overlapping bars; phase 2: draw the text; phase 3: exit animation; phase 4: completed
  let animationPhase = 1;
  let textDispTimeElapsed = -1;

  function animate() {
    if (animationPhase === 1) {
      if (lastAnimLine !== nowAnimLine) {
        startTime = +new Date();
        lastAnimLine = nowAnimLine;
      }
      const nowTime = +new Date();
      const tx = tXs[nowAnimLine];
      const ctXs = Math.min(((nowTime - startTime) / perlineAnimTime) * tx - tx, 0);
      lines[nowAnimLine].style.transform = `translate(${ctXs}px, 0px)`;

      if (ctXs >= 0) {
        nowAnimLine++;
      }

      if (nowAnimLine > 2) {
        animationPhase++;
      }
    } else if (animationPhase === 2) {
      if (textDispTimeElapsed === -1) {
        startTime = +new Date();
        prplBar.innerText = textToDisplay;
      }
      textDispTimeElapsed = +new Date() - startTime;
      if (textDispTimeElapsed >= showTextFor) {
        prplBar.innerText = '';
        startTime = +new Date();
        animationPhase++;
      }
    } else if (animationPhase === 3) {
      const ctX = (rect.width * (+new Date() - startTime)) / fadeOutFor;
      container.style.transform = `translate(${ctX}px, 0px)`;
      if (ctX >= rect.width) {
        animationPhase++;
      }
    }

    if (animationPhase < 4) {
      requestAnimationFrame(animate);
    } else {
      container.remove();
      resolveFn();
    }
  }
  requestAnimationFrame(animate);
  return p as Promise<void>;
}
