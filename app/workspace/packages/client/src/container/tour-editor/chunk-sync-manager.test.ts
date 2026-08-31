import { ApiRequestError } from '@fable/common/dist/api';
import ChunkSyncManager, { SyncStatus, SyncTarget } from './chunk-sync-manager';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ChunkSyncManager', () => {
  const prefix = 'fable/test-sync';
  const key = `${prefix}/tour`;

  beforeEach(() => {
    localStorage.clear();
  });

  it('deletes a journal entry only after server acknowledgement', async () => {
    const ack = deferred<void>();
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: () => ack.promise,
    }, 60000);
    manager.add(key, { value: 1 }, (_, value) => value);

    const polling = manager.poll();
    expect(localStorage.getItem(key)).not.toBeNull();
    ack.resolve();
    await polling;
    expect(localStorage.getItem(key)).toBeNull();
    await manager.end();
  });

  it('keeps failed saves and retries them after backoff', async () => {
    let currentTime = 1000;
    const now = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    const save = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const statuses: SyncStatus[] = [];
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: save,
      onStatusChange: status => statuses.push(status),
    }, 100);
    manager.add(key, { value: 1 }, (_, value) => value);

    await manager.poll();
    expect(localStorage.getItem(key)).not.toBeNull();
    expect(statuses.some(status => status.type === 'retrying')).toBe(true);

    currentTime += 100;
    await manager.poll();
    expect(save).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(key)).toBeNull();
    now.mockRestore();
    await manager.end();
  });

  it('recovers an edit after reload and retains it until the recovery save succeeds', async () => {
    localStorage.setItem(key, JSON.stringify({ value: 1 }));
    const recovered = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save }, 60000);

    manager.startIfNotAlreadyStarted(recovered);
    expect(recovered).toHaveBeenCalledWith(key, { value: 1 });
    expect(localStorage.getItem(key)).not.toBeNull();

    await manager.poll();
    expect(localStorage.getItem(key)).toBeNull();
    await manager.end();
  });

  it('does not delete a newer edit that arrives while a save is in flight', async () => {
    const firstAck = deferred<void>();
    const save = jest.fn()
      .mockImplementationOnce(() => firstAck.promise)
      .mockResolvedValue(undefined);
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save }, 60000);
    manager.add(key, { value: 1 }, (_, value) => value);

    const firstPoll = manager.poll();
    manager.add(key, { value: 2 }, (_, value) => value);
    firstAck.resolve();
    await firstPoll;
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ value: 2 });

    await manager.poll();
    expect(localStorage.getItem(key)).toBeNull();
    await manager.end();
  });

  it('keeps the original base revision across reload and rebases a newer queued edit after acknowledgement', async () => {
    const firstAck = deferred<{revision: number}>();
    const save = jest.fn()
      .mockImplementationOnce(() => firstAck.promise)
      .mockResolvedValue({ revision: 300 });
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save }, 60000);
    manager.add(key, { value: 1 }, (_, value) => value, undefined, 100);

    const firstPoll = manager.poll();
    expect(save).toHaveBeenCalledWith(key, { value: 1 }, 100);
    manager.add(key, { value: 2 }, (_, value) => value, undefined, 999);
    firstAck.resolve({ revision: 200 });
    await firstPoll;

    await manager.poll();
    expect(save).toHaveBeenLastCalledWith(key, { value: 2 }, 200);
    expect(localStorage.getItem(key)).toBeNull();
    await manager.end();
  });

  it('can rebase another journal targeting the same server entity after a successful save', async () => {
    const relatedKey = `${prefix}/global`;
    const save = jest.fn()
      .mockResolvedValueOnce({ revision: 200 })
      .mockResolvedValueOnce({ revision: 300 });
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: save,
      onAcknowledged: (savedKey, acknowledgement) => {
        if (acknowledgement.revision !== undefined) {
          manager.rebaseExpectedRevisions(candidate => candidate !== savedKey, acknowledgement.revision);
        }
      },
    }, 60000);
    manager.add(key, { value: 1 }, (_, value) => value, undefined, 100);
    manager.add(relatedKey, { value: 2 }, (_, value) => value, undefined, 100);

    await manager.poll();
    expect(save).toHaveBeenNthCalledWith(1, key, { value: 1 }, 100);
    expect(save).toHaveBeenNthCalledWith(2, relatedKey, { value: 2 }, 200);
    await manager.end();
  });

  it('retains and reports a stale-revision conflict without retrying it', async () => {
    const save = jest.fn().mockRejectedValue(new ApiRequestError(409, 'conflict', {}));
    const statuses: SyncStatus[] = [];
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: save,
      onStatusChange: status => statuses.push(status),
    }, 1);
    manager.add(key, { value: 1 }, (_, value) => value);

    await manager.poll();
    await manager.poll();
    expect(save).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(key)).not.toBeNull();
    expect(statuses.some(status => status.type === 'conflict')).toBe(true);
    await manager.end();
  });
});
