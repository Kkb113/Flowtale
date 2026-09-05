import { getOrderedAnnotaionFromMain } from './utils';

jest.mock('nanoid', () => ({ nanoid: () => 'fixture' }));

const fixtures = (destination = 'a'): any[] => [{ screen: { id: 10 },
  annotations: [
    { refId: 'a', buttons: [{ type: 'next', hotspot: { actionType: 'navigate', actionValue: { _val: '10/b' } } }] },
    { refId: 'b', buttons: [{ type: 'next', hotspot: { actionType: 'navigate', actionValue: { _val: `10/${destination}` } } }] },
  ] }];

it('visits a cyclic navigation flow once per annotation instead of hanging playback', () => {
  expect(getOrderedAnnotaionFromMain(fixtures(), '10/a').map(annotation => annotation.refId)).toEqual(['a', 'b']);
});

it('retains reachable steps when a legacy destination or next button is missing', () => {
  expect(getOrderedAnnotaionFromMain(fixtures('missing'), '10/a').map(annotation => annotation.refId)).toEqual(['a', 'b']);
  expect(getOrderedAnnotaionFromMain(fixtures(), '10/missing')).toEqual([]);
  const data = fixtures();
  data[0].annotations[1].buttons = [];
  expect(getOrderedAnnotaionFromMain(data, '10/a').map(annotation => annotation.refId)).toEqual(['a', 'b']);
});
