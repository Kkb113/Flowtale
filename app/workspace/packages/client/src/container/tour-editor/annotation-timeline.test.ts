import { IAnnotationConfig } from '@fable/common/dist/types';
import { AnnotationPerScreen } from '../../types';
import { buildAnnotationTimeline } from './annotation-timeline';

function annotation(refId: string, prev?: string, next?: string): IAnnotationConfig {
  return { refId,
    buttons: [
      { type: 'prev', hotspot: prev ? { actionType: 'navigate', actionValue: { _val: prev } } : null },
      { type: 'next', hotspot: next ? { actionType: 'navigate', actionValue: { _val: next } } : null }
    ] } as IAnnotationConfig;
}

function paths(annotations: IAnnotationConfig[]): string[][] {
  const screens = [{ screen: { id: 1 }, annotations }] as AnnotationPerScreen[];
  return buildAnnotationTimeline(screens).map(path => path.map(item => item.refId));
}

it('preserves ordinary navigation ordering even when storage order differs', () => {
  expect(paths([annotation('b', '1/a'), annotation('a', undefined, '1/b')])).toEqual([['a', 'b']]);
});

it('keeps empty and missing-button demos editable', () => {
  expect(paths([])).toEqual([]);
  expect(paths([{ refId: 'a' } as IAnnotationConfig])).toEqual([['a']]);
});

it('terminates a broken link and retains its disconnected destination candidates', () => {
  expect(paths([annotation('a', undefined, '1/missing'), annotation('b', '1/missing')]))
    .toEqual([['a'], ['b']]);
});

it('exposes cycles without an entry point and terminates self-links', () => {
  expect(paths([annotation('a', '1/b', '1/b'), annotation('b', '1/a', '1/a'),
    annotation('c', '1/c', '1/c')])).toEqual([['a', 'b'], ['c']]);
});

it('does not duplicate a shared destination when branches merge', () => {
  expect(paths([annotation('a', undefined, '1/c'), annotation('b', undefined, '1/c'),
    annotation('c', '1/a')])).toEqual([['a', 'c'], ['b']]);
});

it('resolves navigation with both the screen ID and annotation ID', () => {
  const screens = [
    { screen: { id: 1 }, annotations: [annotation('a', undefined, '2/a')] },
    { screen: { id: 2 }, annotations: [annotation('a', '1/a')] }
  ] as AnnotationPerScreen[];
  expect(buildAnnotationTimeline(screens).map(path => path.map(item => item.screen.id))).toEqual([[1, 2]]);
});
