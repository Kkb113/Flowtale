// format of css
// n number of comment lines in the beginning starting with @dir
// Then goes the css body. Supported format => either normal css3 or via a simple compilation pipeline
// The compilation pipeline does simple string interpolation for the timebeing
// Interpolated string
// f-actn-idr--not-selected-subtree   :: replace this with selector of the subtree that is not selected
// f-actn-idr--selected-subtree       :: replace this with selector of the subtree that is selected
// f-actn-idr--selected-subtree-hss   :: replace this with selector of the subtree that has highest specificity

import raiseDeferredError from '@fable/common/dist/deferred-error';

interface Effect {
  id: string;
  displayName: string;
  desc: string;
  css: string;
}

function process(rawEffects: Effect[]): Effect[] {
  return rawEffects.map(ef => ({
    ...ef,
    css: `
/* @dir effect=${ef.id} */
/* !!! DO NOT DELETE ABOVE LINE. DO NOT LET YOUR INTRUSIVE THOUGHT WIN FOR ONCE. CSS STARTS FROM BELOW */

${ef.css}
`.trim()
  }));
}

export function getEffectFromString(effects: Effect[], cssStr?: string): Effect {
  const l = effects.length;
  const fallback = effects[0];
  try {
    const nCssStr = (cssStr || '').trim();
    if (!nCssStr) return fallback;

    fallback.css = nCssStr;

    const firstDirLine = nCssStr.split(/\n+/)[0];
    if (!firstDirLine) return fallback;

    const extract = firstDirLine.match(/^\/\*\s*@dir\s+(.*)\*\//);
    if (!extract) return fallback;
    if (!extract[1]) return fallback;

    const dirs = extract[1].trim();
    const dirArr = dirs.split(';');
    const dirsMap: Record<string, string> = {};
    for (const dir of dirArr) {
      const [key, ...value] = dir.split('=');
      dirsMap[key.trim()] = value.join('=').trim();
    }
    const effect = effects.find(ef => ef.id === dirsMap.effect) || fallback;
    effect.css = nCssStr;
    return effect;
  } catch (e) {
    raiseDeferredError(e as Error);
    return fallback;
  }
}

export const elEffects: Effect[] = process([{
  id: 'sincity',
  displayName: 'Sincity',
  desc: 'Make the full page black-&-white except the selected element',
  css: `
{{f-actn-idr--not-selected-subtree}} {
  filter: saturate(0);
}

{{f-actn-idr--selected-subtree}} {
  filter: saturate(1);
}
`.trim()
}, {
  id: 'clarity',
  displayName: 'Clarity',
  desc: 'Make the full page go blur except the selected element',
  css: `
{{f-actn-idr--not-selected-subtree}} {
  filter: blur(2px);
}

{{f-actn-idr--selected-subtree}} {
  filter: blur(0);
}
`.trim()
}, {
  id: 'material',
  displayName: 'Material Design',
  desc: 'Google\'s material design focus style',
  css: `
{{f-actn-idr--selected-subtree-hss}} {
  box-shadow: 0px 14px 28px 0px rgba(0,0,0,0.25), 0px 10px 10px 0px rgba(0,0,0,0.22);
}
`.trim()
}, {
  id: 'cyberpunk',
  displayName: 'Cyberpunk',
  desc: 'Effects from post apocalyptic world',
  css: `
{{f-actn-idr--selected-subtree-hss}} {
  border: 1px solid var(--fable-ann-bg-color);
  filter: drop-shadow(5px 5px 0 var(--fable-ann-bg-color)) hue-rotate(180deg) drop-shadow(5px 5px 0 var(--fable-ann-bg-color));
}
`.trim()
}, {
  id: 'colorswap',
  displayName: 'Color Swap',
  desc: 'Change background color',
  css: `
{{f-actn-idr--selected-subtree-hss}} {
  --bg1: var(--fable-ann-bg-color);
  --bg2: var(--fable-ann-bg-color);

  background: linear-gradient(90deg, color-mix(in srgb, var(--bg1)  90%, white) 0%, color-mix(in srgb, var(--bg2) 90%, black) 100%);
}
`.trim()
}, {
  id: 'custom',
  displayName: 'Custom',
  desc: 'Write your custom effect via css3',
  css: `
{{f-actn-idr--selected-subtree-hss}} {
  /* element that is selected with highest probably specificity */
}

{{f-actn-idr--not-selected-subtree}} {
  /* elements that are not selected */
}

{{f-actn-idr--selected-subtree}} {
  /* elements that is selected with general selector */
}
`.trim()
}]);

export const annEffects: Effect[] = process([{
  id: 'wave',
  displayName: 'Wave',
  desc: 'Wave effect on annotation',
  css: `
{{f-actn-idr--ann-card-con}} {
  --wave-bg-front: #4242421f;
  --wave-bg-back: #4242421f;

  overflow: hidden;
  &::before {
    z-index:0;
    position: absolute;
    content: '';
    bottom: 76px;
    width: 200%;
    height: 150%;
    left: -50%;
    margin-top: -10px;
    border-radius: 40%;
    background: var(--wave-bg-back);
    animation: wave 8s infinite ease-out;
  }

 &::after {
    z-index:0;
    position: absolute;
    content: '';
    bottom: 66px;
    width: 210%;
    height: 150%;
    left: -51%;
    margin-top: -10px;
    border-radius: 42%;
    background: var(--wave-bg-front);
    animation: wave2 10s infinite ease-out;
  }
}

{{f-actn-idr--ann-card-con}} .f-text {
  z-index: 1;
}
{{f-actn-idr--ann-card-con}} .f-button-con {
  border-top: none !important;
}

@keyframes wave {
  0% { transform: rotate(0deg);}
  50% { transform: rotate(8deg);}
  100% { transform: rotate(0deg);}
}

@keyframes wave2 {
  0% { transform: rotate(0deg);}
  50% { transform: rotate(-8deg);}
  100% { transform: rotate(0deg);}
}
`.trim()
}, {
  id: 'beckham',
  displayName: 'Beckham',
  desc: 'Bend a ligher color through the edge',
  css: `
{{f-actn-idr--ann-card-con}} {
  --bg: #45454547;
  --btm-offset: 55;
  --gap: 4%;
  --width: 96%;

  &::before {
    content: '';
    position: absolute;
    background: var(--bg);
    height: calc(100% - var(--fable-ann-con-pad-y) * 1px - var(--btm-offset) * 1px);
    top: 0;
    border-radius: calc(var(--fable-ann-border-radius) * 1px);
    z-index: 0;
  }

  &.dir-b, &.dir-t {
    &::before {
      width: var(--width);
      left: var(--gap);
      border-bottom-right-radius: 65px;
      border-bottom-left-radius: 65px;
    }
  }

  &.dir-r {
    &::before {
      width: var(--width);
      right: var(--gap);
      border-bottom-right-radius: 65px;
      border-bottom-left-radius: 0px;
    }
  }

  &.dir-l {
    &::before {
      width: var(--width);
      left: var(--gap);
      border-bottom-left-radius: 65px;
      border-bottom-right-radius: 0px;
    }
  }
}

{{f-actn-idr--ann-card-con}} .f-text {
  z-index: 1;
}
{{f-actn-idr--ann-card-con}} .f-button-con {
  border-top: none !important;
}
`.trim()
}, {
  id: 'bleedingedge',
  displayName: 'Bleeding Edge',
  desc: 'Bleed a opposite color from edge',
  css: `
{{f-actn-idr--ann-card-con}} {
  --filter: hue-rotate(180deg);
  --bg: var(--fable-ann-bg-color);

  &::before {
    content: '';
    position: absolute;
    filter: var(--filter);
    background: var(--bg);
  }

  &.dir-t {
    &::before {
      width: 100%;
      height: calc(var(--fable-ann-con-pad-y) * 0.5px);
      bottom: 0;
      border-bottom-left-radius: calc(var(--fable-ann-border-radius) * 1px);
      border-bottom-right-radius: calc(var(--fable-ann-border-radius) * 1px);
    }
  }

  &.dir-b {
    &::before {
      width: 100%;
      height: calc(var(--fable-ann-con-pad-y) * 0.5px);
      top: 0;
      border-top-left-radius: calc(var(--fable-ann-border-radius) * 1px);
      border-top-right-radius: calc(var(--fable-ann-border-radius) * 1px);
    }
  }

  &.dir-l {
    &::before {
      width: calc(var(--fable-ann-con-pad-x) * 0.5px);
      height: 100%;
      right: 0;
      border-top-right-radius: calc(var(--fable-ann-border-radius) * 1px);
      border-bottom-right-radius: calc(var(--fable-ann-border-radius) * 1px);
    }
  }

  &.dir-r {
    &::before {
      width: calc(var(--fable-ann-con-pad-x) * 0.5px);
      height: 100%;
      left: 0;
      border-top-left-radius: calc(var(--fable-ann-border-radius) * 1px);
      border-bottom-left-radius: calc(var(--fable-ann-border-radius) * 1px);
    }
  }
}
.fab-arr-path {
  filter: hue-rotate(180deg);
  fill: var(--fable-ann-bg-color);
}
`.trim()
}, {
  id: 'glassceiling',
  displayName: 'Glass Ceiling',
  desc: 'Glass effect on annotaiton card',
  css: `
{{f-actn-idr--ann-card-con}} {
  background-color: color-mix(in srgb, var(--fable-ann-bg-color) 20%, transparent) !important;
  background: color-mix(in srgb, var(--fable-ann-bg-color) 20%, transparent) !important;
  backdrop-filter: blur(8px);
}

{{f-actn-idr--ann-card-con}} .f-button-con {
  border-top: none !important;
}

{{f-actn-idr--ann-card-con}} .f-text p {
  color: black !important;
}

{{f-actn-idr--ann-card-con}} .f-progress {
  background: transparent !important;
}

.fab-arr-path {
  fill: color-mix(in srgb, var(--fable-ann-bg-color) 50%, transparent) !important;
}
`.trim()
},
{
  id: 'custom',
  displayName: 'Custom',
  desc: 'Write your custom effect via css3',
  css: `
{{f-actn-idr--ann-card-con}} {

}

{{f-actn-idr--ann-card-con}} .f-inner-con {
  /* Inner container */
}

{{f-actn-idr--ann-card-con}} .f-text p {
  /* Text content */
}


{{f-actn-idr--ann-card-con}} .f-button-con {
  /* Button container */
}

{{f-actn-idr--ann-card-con}} .f-progress {
  /* Progress indicator */
}
`.trim()
}]);

// .f-fable-an-t-path > :not(.f-fable-an-t-path, .f-fable-an-target) {
//   filter: saturate(0);
// }

// .f-fable-an-target {
//   filter: saturate(1);
// }
