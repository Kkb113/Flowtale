import api from '@fable/common/dist/api';
import { runDbRequest } from '@fable/common/dist/db-utils';
import { CreationJournal } from './creation-journal';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@fable/common/dist/db-utils', () => ({ runDbRequest: jest.fn() }));

const rows = new Map<string, unknown>();
const db = {} as IDBDatabase;
const journal = (scope = 'user/workspace/capture', context = (): void => {}) => (
  new CreationJournal(db, scope, 'capture', context)
);

beforeEach(() => {
  rows.clear();
  jest.resetAllMocks();
  (runDbRequest as jest.Mock).mockImplementation(async (_db, _store, _mode, operation) => operation({
    get: (key: string) => rows.get(key),
    delete: (key: string) => rows.delete(key),
    put: (row: { id: string }) => { rows.set(row.id, row); return row.id; },
  }));
});

it('rebuilds only the reviewed append and gives its final save a new durable receipt key', async () => {
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'review-attempt' } });
  await journal().checkpoint('document', async () => ({ revision: 100 }));
  await journal().request('copy-0', '/copyscreen', { parentId: 5 });
  await journal().request('final-save', '/recordtredit', { expectedRevision: 100 });
  await journal().reviewAppend(['screens', { id: 1, updatedAt: 200 }]);
  expect(await journal().read('document')).toBeUndefined();
  expect(await journal().read('intent')).toEqual(['screens', { id: 1, updatedAt: 200 }]);
  expect(await journal().read('request/copy-0')).toBeDefined();
  await journal().request('final-save', '/recordtredit', { expectedRevision: 200 });
  const calls = (api as jest.Mock).mock.calls;
  const first = calls[calls.length - 1];
  await journal().request('final-save', '/recordtredit', { expectedRevision: 300 });
  expect(calls[calls.length - 1]).toEqual(first);
  expect(first[1].headers['Idempotency-Key']).toBe('capture/final-save/review-attempt');
});

it('persists exact intent before dispatch and replays it after a lost acknowledgement and reload', async () => {
  (api as jest.Mock).mockImplementationOnce(async () => {
    expect(rows.size).toBe(1);
    throw new Error('Lost response');
  }).mockResolvedValue({ rid: 'only-one-demo' });
  const input = { name: 'Original name' };
  await expect(journal().request('tour', '/newtour', input)).rejects.toThrow('Lost response');
  input.name = 'Changed in memory';
  await expect(journal().request('tour', '/newtour', input)).resolves.toEqual({ rid: 'only-one-demo' });
  expect((api as jest.Mock).mock.calls[0]).toEqual((api as jest.Mock).mock.calls[1]);
  expect(api).toHaveBeenLastCalledWith('/newtour', {
    auth: true, body: { name: 'Original name' }, headers: { 'Idempotency-Key': 'capture/tour' },
  });
});

it('does not dispatch when the storage transaction cannot commit', async () => {
  (runDbRequest as jest.Mock).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Storage full'));
  await expect(journal().request('tour', '/newtour', {})).rejects.toThrow('Storage full');
  expect(api).not.toHaveBeenCalled();
});

it('keeps workspace and principal checkpoints separate and rejects a context change', async () => {
  await journal().checkpoint('intent', async () => 'first');
  expect(await journal('other/workspace/capture').read('intent')).toBeUndefined();
  expect(await journal('user/other/capture').read('intent')).toBeUndefined();
  await expect(journal(undefined, () => { throw new Error('Context changed'); }).request('tour', '/newtour', {}))
    .rejects.toThrow('Context changed');
  expect(api).not.toHaveBeenCalled();
});

it('preserves the generated final document and rejects reuse for a different endpoint', async () => {
  await journal().checkpoint('document', async () => ({ annotationId: 'original', revision: 100 }));
  expect(await journal().checkpoint('document', async () => ({ annotationId: 'new', revision: 200 })))
    .toEqual({ annotationId: 'original', revision: 100 });
  await journal().request('tour', '/newtour', {});
  (api as jest.Mock).mockClear();
  await expect(journal().request('tour', '/copyscreen', {})).rejects.toThrow('does not match');
  expect(api).not.toHaveBeenCalled();
});
