import { ScreenData } from '@fable/common/dist/types';
import { applyEditsToSerDom, getSerNodeFromPath } from './edits';
import { EditItem, ElEditType, ElIdentifierType } from '../../../types';

jest.mock('nanoid', () => ({ nanoid: () => 'fixture-id' }));
jest.mock('../../../utils', () => ({ getSerNodesElPathFromFids: () => ({}) }));

const document = (): ScreenData => ({
  version: '2023-07-27',
  vpd: { w: 640, h: 400 },
  isHTML4: false,
  docTree: { type: 1,
    name: 'input',
    attrs: {},
    props: { proxyUrlMap: {}, nodeProps: { checked: true } },
    chldrn: [],
    sv: 2 },
});
const inputEdit = (path: string, value: string): EditItem => [
  'input', path, '', ElEditType.InputValue, false, 1, [1, '', value, ''], ElIdentifierType.PATH, false,
];

it.each([undefined, '', 'original'])('applies and clears input values regardless of captured initial value %s', initial => {
  const data = document();
  if (initial !== undefined) {
    data.docTree.attrs.value = initial;
    data.docTree.props.nodeProps!.value = initial;
  }
  applyEditsToSerDom([inputEdit('1', 'replacement')], data);
  expect(data.docTree.attrs.value).toBe('replacement');
  expect(data.docTree.props.nodeProps).toEqual({ checked: true, value: 'replacement' });
  applyEditsToSerDom([inputEdit('1', '')], data);
  expect(data.docTree.attrs.value).toBe('');
  expect(data.docTree.props.nodeProps!.value).toBe('');
});

it('skips missing or malformed legacy targets without preventing valid edits from rendering', () => {
  const data = document();
  for (const path of ['1.9.0', '1.-1', '1.bad', 'wrong.0']) {
    expect(getSerNodeFromPath(path, data.docTree)).toBeUndefined();
  }
  expect(() => applyEditsToSerDom([inputEdit('1.9.0', 'stale'), inputEdit('1', 'valid')], data)).not.toThrow();
  expect(data.docTree.props.nodeProps!.value).toBe('valid');
});

it('updates a targeted text node rather than adding children that text nodes cannot render', () => {
  const data = document();
  data.docTree.type = 3;
  data.docTree.name = '#text';
  data.docTree.props.textContent = 'Private original';
  const edit: EditItem = ['text', '1', '', ElEditType.Text, false, 1,
    [1, 'Private original', 'Public replacement', ''], ElIdentifierType.PATH, false];
  applyEditsToSerDom([edit], data);
  expect(data.docTree.props.textContent).toBe('Public replacement');
  expect(data.docTree.chldrn).toEqual([]);
});
