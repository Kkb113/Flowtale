import api, { ApiRequestError } from '@fable/common/dist/api';
import { createEmptyTourDataFile, getSampleGlobalConfig } from '@fable/common/dist/utils';
import { saveAsTour, reviewAppendDestination, acceptAppendDestination, handleAssetOperation } from './utils';
import { CreationJournal } from './creation-journal';

const journal = {
  complete: async (result: unknown) => result,
  checkpoint: async (_key: string, create: () => Promise<unknown>) => create(),
  request: async (_key: string, path: string, body: unknown) => api(path, { auth: true, body }),
} as CreationJournal;

jest.mock('@fable/common/dist/api', () => ({
  ...jest.requireActual('@fable/common/dist/api'),
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('nanoid', () => ({ nanoid: () => 'fixture-id' }));
jest.mock('../../utils', () => ({
  getColorContrast: () => 'light',
  createAnnotationHotspot: (screenId: number, refId: string) => ({ actionValue: { _val: `${screenId}/${refId}` } }),
}));
jest.mock('../../entity-processor', () => ({ getDefaultThumbnailHash: () => 'fixture-thumbnail' }));
jest.mock('../../upload-media-to-aws', () => ({}));

const config = getSampleGlobalConfig();
const target = { rid: 'target-demo', updatedAt: new Date(1000), dataFileUri: { href: 'https://fixture.test/draft' } };

test('captured blob images stay inside the screen document without a public upload', async () => {
  const node = { attrs: { src: 'blob:recording' }, props: { base64Img: 'aW1hZ2U=' } } as any;
  const progress = jest.fn();
  await handleAssetOperation([{ type: 'base64', node, attr: 'src', originalBlobUrl: 'blob:recording' } as any], new Map(), undefined, progress);
  expect(node.attrs.src).toBe('data:image/png;base64,aW1hZ2U=');
  expect(node.props.origHref).toBe('blob:recording');
  expect(api).not.toHaveBeenCalled();
  expect(progress).toHaveBeenCalledWith(1);
});

beforeEach(() => {
  jest.clearAllMocks();
  const document = createEmptyTourDataFile(config);
  document.opts.main = 'existing-screen/existing-annotation';
  (api as jest.Mock).mockImplementation(async (url: string) => {
    if (url === target.dataFileUri.href) return { ...document, futureProperty: { preserved: true } };
    return { status: 'Success', data: { rid: target.rid, updatedAt: new Date(2000) } };
  });
});

it('guards an append with the selected destination revision and preserves unknown fields', async () => {
  await saveAsTour(journal, [], target as any, config, null, 'global', 'manual', 'capture-fixture', '', '');
  const [, request] = (api as jest.Mock).mock.calls.find(([url]) => url === '/recordtredit')!;
  expect(request.body.expectedRevision).toBe(1000);
  expect(JSON.parse(request.body.editData).futureProperty).toEqual({ preserved: true });
});

it('preserves an empty destination when there are no appended screens', async () => {
  const normal = (api as jest.Mock).getMockImplementation()!;
  (api as jest.Mock).mockImplementation((url: string, request: unknown) => (
    url === target.dataFileUri.href ? createEmptyTourDataFile(config) : normal(url, request)
  ));
  await saveAsTour(journal, [], target as any, config, null, 'global', 'manual', 'capture-fixture', '', '');
  const [, request] = (api as jest.Mock).mock.calls.find(([url]) => url === '/recordtredit')!;
  const saved = JSON.parse(request.body.editData);
  expect(saved.opts.main).toBe('');
  expect(saved.entities).toEqual({});
});

it('saves a final module with no following step and keeps it disconnected from the preceding flow', async () => {
  const normal = (api as jest.Mock).getMockImplementation()!;
  (api as jest.Mock).mockImplementation((url: string, request: any) => (
    url === '/copyscreen' ? { status: 'Success', data: { id: request.body.parentId } } : normal(url, request)
  ));
  const screens = [1, 2].map(id => ({
    info: { id, rid: `screen-${id}`, type: 1, elPath: '1', markedImage: null },
    screenType: 'default',
    skipped: false,
    aiAnnotationData: null,
    ...(id === 2 ? { moduleData: { name: 'Final module', description: 'One step' } } : {}),
  }));
  await saveAsTour(journal, screens as any, target as any, config, null, 'global', 'manual', 'capture-fixture', '', '');
  const [, request] = (api as jest.Mock).mock.calls.find(([url]) => url === '/recordtredit')!;
  const saved = JSON.parse(request.body.editData);
  expect(saved.journey.flows).toEqual(expect.arrayContaining([expect.objectContaining({ header1: 'Final module' })]));
  for (const id of [1, 2]) {
    const annotation = Object.values(saved.entities[id].annotations)[0] as any;
    expect(annotation.buttons.find((button: any) => button.type === 'next').hotspot).toBeNull();
  }
});

it('preserves a conflict for explicit recovery instead of retrying without a revision', async () => {
  const normal = (api as jest.Mock).getMockImplementation()!;
  (api as jest.Mock).mockImplementation((url: string, request: unknown) => {
    if (url === '/recordtredit') throw new ApiRequestError(409, 'Destination changed', null);
    return normal(url, request);
  });
  await expect(saveAsTour(journal, [], target as any, config, null, 'global', 'manual', 'capture-fixture', '', ''))
    .rejects.toMatchObject({ status: 409 });
  expect((api as jest.Mock).mock.calls.filter(([url]) => url === '/recordtredit')).toHaveLength(1);
});

it('does not make an unguarded write when the selected destination has no revision', async () => {
  const noRevision = { ...target, updatedAt: undefined } as any;
  const saving = saveAsTour(journal, [], noRevision, config, null, 'global', 'manual', 'capture-fixture', '', '');
  await expect(saving).rejects.toThrow('Reload the destination');
  expect(api).not.toHaveBeenCalled();
});

it('retains the append plan when its destination was deleted or became inaccessible', async () => {
  const recovery = { read: jest.fn().mockResolvedValue([[], { id: 42 }]), reviewAppend: jest.fn() } as unknown as CreationJournal;
  (api as jest.Mock).mockResolvedValue({ data: [] });
  await expect(reviewAppendDestination(recovery)).rejects.toThrow('deleted or is no longer accessible');
  expect(recovery.reviewAppend).not.toHaveBeenCalled();
});

it('rejects applying a reviewed append to a different destination', async () => {
  const recovery = { read: jest.fn().mockResolvedValue([[], { id: 42 }]), reviewAppend: jest.fn() } as unknown as CreationJournal;
  await expect(acceptAppendDestination(recovery, { id: 43, updatedAt: new Date() } as any))
    .rejects.toThrow('does not match');
  expect(recovery.reviewAppend).not.toHaveBeenCalled();
});
