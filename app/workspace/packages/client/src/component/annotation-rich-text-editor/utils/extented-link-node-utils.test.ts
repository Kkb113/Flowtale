/* eslint-disable no-script-url -- rejected URL fixtures */
import { commonExportDOMOverride, getVideoEmbedabilityProps } from './extented-link-node-utils';

it.each([
  ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=1', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
  ['youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'],
  ['https://loom.com/share/abcdef0123456789?sid=tracking', 'https://www.loom.com/embed/abcdef0123456789'],
  ['https://vimeo.com/123456', 'https://player.vimeo.com/video/123456'],
  ['https://player.vimeo.com/video/123456', 'https://player.vimeo.com/video/123456'],
])('exports a working supported embed for %s', (source, expected) => {
  expect(getVideoEmbedabilityProps(source)).toMatchObject({ isEmbeddable: true, embedUrl: expected });
  const exported = commonExportDOMOverride(source).element as HTMLElement;
  expect(exported.querySelector('iframe')?.src).toBe(expected);
});

it.each(['https://loom.com/', 'https://vimeo.com/not-a-video', 'https://youtube.com/watch',
  'https://youtube.com.attacker.invalid/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)'])('%s is not an embed', source => {
  expect(getVideoEmbedabilityProps(source)).toEqual({ isEmbeddable: false, embedProvider: null, embedUrl: '' });
});
