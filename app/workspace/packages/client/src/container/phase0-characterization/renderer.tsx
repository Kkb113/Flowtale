import React, { useRef, useState } from 'react';
import { ScreenType } from '@fable/common/dist/api-contract';
import { ScreenData, SerNode } from '@fable/common/dist/types';
import ScreenPreview from '../../component/screen-editor/preview';
import { P_RespScreen } from '../../entity-processor';
import { sanitizeRichText } from '../../rich-text-sanitizer';
import { applyUpdateDiff } from '../../component/screen-editor/utils/diffs/apply-diffs-anims';

const node = (
  name: string,
  attrs: SerNode['attrs'] = {},
  chldrn: SerNode[] = [],
  props: Partial<SerNode['props']> = {}
): SerNode => ({
  type: 1, name, attrs, props: { proxyUrlMap: {}, ...props }, chldrn, sv: 2,
});
const text = (value: string): SerNode => ({ ...node('#text'),
  type: 3,
  props: { proxyUrlMap: {}, textContent: value } });
const html = (children: SerNode[]): SerNode => node('html', {}, [node('head'), node('body', {}, children)]);
const nested = node('iframe', { id: 'nested', src: 'about:blank', style: 'width:300px;height:100px' }, [
  html([node('button', { id: 'nested-button' }, [text('Nested capture')])]),
]);
const data: ScreenData = { version: '2023-07-27',
  vpd: { w: 640, h: 400 },
  isHTML4: false,
  docTree: html([
    node('button', { id: 'target', 'f-id': 'target', onclick: 'parent.__captureScriptRan=true' }, [text('Captured button')]),
    node('script', {}, [text('parent.__captureScriptRan=true')]),
    node('input', { id: 'captured-input' }, [], { nodeProps: { type: 'text', value: 'Captured value' } }),
    nested,
    node('iframe', { id: 'srcdoc-frame',
      srcdoc: '<p id="srcdoc-content">Static nested content</p>'
      + '<script>parent.__captureScriptRan=true</script>' }),
  ]),
};
// Only the renderer-consumed fields are needed; this fixture never writes a database resource.
const screen = { id: -1,
  rid: 'security-fixture',
  type: ScreenType.SerDom,
  dataFileUri: new URL('https://fixture.invalid/published/index.json'),
  displayName: 'Captured security fixture',
  responsive: false } as P_RespScreen;

export default function RendererCharacterization(): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [clicks, setClicks] = useState(0);
  const change = (): void => {
    const target = frameRef.current!.contentDocument!.getElementById('target')!;
    target.textContent = 'Edited through parent DOM';
    applyUpdateDiff([{ attrKey: 'onclick',
      attrOldVal: '',
      attrNewVal: 'parent.__captureScriptRan=true',
      shouldRemove: false }], target);
  };
  return (
    <main>
      <h1>Actual captured renderer characterization</h1>
      <output data-testid="render-status">{loaded ? 'Ready' : 'Loading'}</output>
      <output data-testid="captured-clicks">{clicks}</output>
      <button type="button" onClick={change} disabled={!loaded}>Edit captured text</button>
      <div
        data-testid="safe-annotation"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(
          '<p><strong>Formatted annotation</strong><img src="data:image/png;base64,invalid" '
          + 'onerror="window.__annotationScriptRan=true"></p>'
        ) }}
      />
      <div style={{ position: 'relative', width: 640, height: 400 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <ScreenPreview
            screen={screen}
            screenData={data}
            allEdits={[]}
            journey={null}
            resizeSignal={0}
            innerRefs={[frameRef]}
            hidden={false}
            showWatermark={false}
            isResponsive={false}
            heightOffset={0}
            playMode={false}
            isScreenPreview={false}
            enableZoomPan={false}
            onFrameAssetLoad={() => setLoaded(true)}
            onBeforeFrameBodyDisplay={() => {
              frameRef.current!.contentDocument!.getElementById('target')!
                .addEventListener('click', () => setClicks(value => value + 1));
            }}
          />
        </div>
      </div>
    </main>
  );
}
