import { ApiRequestError } from '@fable/common/dist/api';
import ChunkSyncManager, { SyncStatus, SyncTarget, Tx } from './chunk-sync-manager';

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

  it('does not treat typing or acknowledgement of a related chunk as conflict resolution', async () => {
    const save = jest.fn().mockRejectedValue(new ApiRequestError(409, 'conflict', {}));
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save }, 1);
    manager.add(key, { value: 1 }, (_, value) => value, undefined, 100);
    await manager.poll();
    manager.add(key, { value: 2 }, (_, value) => value, undefined, 200);
    manager.rebaseExpectedRevisions(() => true, 300);
    await manager.poll();
    expect(save).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ value: { value: 2 }, expectedRevision: 100 });
    await manager.end();
  });

  it('preserves staged edits when promotion fails because storage is full', () => {
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: jest.fn() });
    const tx = new Tx().start();
    manager.add(key, { value: 1 }, (_, value) => value, tx, 100);
    const staged = localStorage.getItem(`tx/${tx.uuid}/${key}`);
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    try {
      expect(() => tx.end()).toThrow('Storage full');
      expect(localStorage.getItem(`tx/${tx.uuid}/${key}`)).toBe(staged);
    } finally {
      setItem.mockRestore();
    }
  });

  it('does not recover or submit journals belonging to a different demo', async () => {
    const otherKey = `${prefix}/another-demo`;
    localStorage.setItem(key, JSON.stringify({ title: 'This demo' }));
    localStorage.setItem(otherKey, JSON.stringify({ title: 'Another demo' }));
    const recovered = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: save,
      acceptsKey: candidate => candidate === key,
    }, 60000);
    manager.startIfNotAlreadyStarted(recovered);
    await manager.poll();
    expect(recovered).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(key, { title: 'This demo' }, undefined);
    expect(localStorage.getItem(otherKey)).toBe(JSON.stringify({ title: 'Another demo' }));
    await manager.end();
  });

  it('retains conflicts across reload, additional typing and related acknowledgements', async () => {
    const save = jest.fn().mockRejectedValue(new ApiRequestError(409, 'conflict', {}));
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save });
    manager.add(key, { value: 1 }, (_, value) => value, undefined, 100);
    await manager.poll();
    await manager.end();

    const statuses: SyncStatus[] = [];
    const recovered = jest.fn();
    const reopened = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, {
      onSyncNeeded: save, onStatusChange: status => statuses.push(status)
    });
    reopened.startIfNotAlreadyStarted(recovered);
    reopened.add(key, { value: 2 }, (_, value) => value, undefined, 200);
    reopened.rebaseExpectedRevisions(() => true, 300);
    await reopened.poll();
    expect(save).toHaveBeenCalledTimes(1);
    expect(recovered).toHaveBeenCalledWith(key, { value: 1 });
    expect(statuses).toContainEqual({ type: 'conflict', key });
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({
      value: { value: 2 }, expectedRevision: 100, conflicted: true
    });
    await reopened.end();
  });

  it('recovers polling after a storage read throws without discarding the edit', async () => {
    let currentTime = 1000;
    const now = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    const save = jest.fn().mockResolvedValue(undefined);
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save }, 100);
    manager.add(key, { value: 1 }, (_, value) => value);
    const read = jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    try {
      await manager.poll();
      expect(save).not.toHaveBeenCalled();
      expect(localStorage.getItem(key)).not.toBeNull();
      currentTime += 100;
      await manager.poll();
      expect(save).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(key)).toBeNull();
    } finally {
      read.mockRestore();
      now.mockRestore();
      await manager.end();
    }
  });

  it('waits for an active save when ending the manager', async () => {
    const ack = deferred<void>();
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: () => ack.promise });
    manager.add(key, { value: 1 }, (_, value) => value);
    const polling = manager.poll();
    const ending = manager.end();
    expect(ending).toBe(polling);
    expect(localStorage.getItem(key)).not.toBeNull();
    ack.resolve();
    await ending;
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('promotes every key in a transaction and retries only callbacks that failed', () => {
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: jest.fn() });
    const second = `${prefix}/second`;
    const tx = new Tx().start();
    manager.add(key, { first: 1 }, (_, value) => value, tx);
    manager.add(second, { second: 2 }, (_, value) => value, tx);
    const originalSet = Storage.prototype.setItem;
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name === second) throw new Error('Quota');
      originalSet.call(this, name, value);
    });
    expect(() => tx.end()).toThrow('Quota');
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ first: 1 });
    expect(localStorage.getItem(`tx/${tx.uuid}/${second}`)).not.toBeNull();
    set.mockRestore();
    localStorage.setItem(key, JSON.stringify({ newer: 3 }));
    tx.end();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ newer: 3 });
    expect(JSON.parse(localStorage.getItem(second)!)).toEqual({ second: 2 });
    expect(localStorage.getItem(`tx/${tx.uuid}/${second}`)).toBeNull();
  });

  it('isolates overlapping transactions and combines repeated writes to one transaction key', () => {
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: jest.fn() });
    const first = new Tx();
    const second = new Tx();
    const merge = (a: object | null, b: object) => ({ ...a, ...b });
    manager.add(key, { a: 1 }, merge, first);
    manager.add(key, { b: 2 }, merge, second);
    manager.add(key, { c: 3 }, merge, first);
    first.end();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ a: 1, c: 3 });
    second.end();
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('exposes legacy, interrupted and corrupt journals for review without submitting staging', async () => {
    localStorage.setItem(`tx/${key}`, JSON.stringify({ legacy: 1 }));
    localStorage.setItem(`tx/session/${key}`, JSON.stringify({ interrupted: 2 }));
    localStorage.setItem(key, '{broken');
    const save = jest.fn();
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save });
    manager.startIfNotAlreadyStarted(jest.fn());
    await manager.pause();
    const entries = manager.getPendingEntries();
    expect(entries.map(entry => entry.kind)).toEqual(['staged', 'staged', 'invalid']);
    expect(entries.every(entry => entry.targetKey === key)).toBe(true);
    expect(save).not.toHaveBeenCalled();
    await manager.end();
  });

  it('requires review of the exact current changes and retains failed or newer recovery saves', async () => {
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: jest.fn() });
    manager.add(key, { value: 1 }, (_, value) => value);
    await manager.pause();
    const snapshot = manager.getPendingEntries()[0];
    await expect(manager.saveReviewed(snapshot, async () => { throw new Error('Offline'); })).rejects.toThrow('Offline');
    expect(localStorage.getItem(key)).toBe(snapshot.serialized);
    const ack = deferred<void>();
    const saving = manager.saveReviewed(snapshot, () => ack.promise);
    manager.add(key, { value: 2 }, (_, value) => value);
    ack.resolve();
    await saving;
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ value: 2 });
    expect(() => manager.discardReviewed(snapshot)).toThrow('Review them again');
    const current = manager.getPendingEntries()[0];
    manager.discardReviewed(current);
    expect(localStorage.getItem(key)).toBeNull();
    await manager.end();
  });

  it.each([null, '1000', -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('retains an invalid revision %p without replaying or submitting the journal', async revision => {
    const serialized = JSON.stringify({ __fableJournalVersion: 1, value: { title: 'Retained' }, expectedRevision: revision });
    localStorage.setItem(key, serialized);
    const save = jest.fn();
    const replay = jest.fn();
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: save });
    manager.startIfNotAlreadyStarted(replay);
    await manager.poll();
    expect(replay).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(manager.getPendingEntries()[0].kind).toBe('invalid');
    expect(localStorage.getItem(key)).toBe(serialized);
    await manager.pause();
    await manager.end();
  });

  it('replays a screen journal when its screen loads later without applying interrupted staging', async () => {
    const screenKey = `${prefix}/screen`;
    const manager = new ChunkSyncManager(SyncTarget.LocalStorage, prefix, { onSyncNeeded: jest.fn() });
    manager.add(screenKey, { title: 'Recover later' }, (_, value) => value);
    manager.add(key, { title: 'Other chunk' }, (_, value) => value);
    localStorage.setItem(`tx/${screenKey}`, JSON.stringify({ title: 'Incomplete transaction' }));
    const restore = jest.fn();
    manager.replayPending(candidate => candidate === screenKey, restore);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledWith(screenKey, { title: 'Recover later' });
    await manager.pause();
    await manager.end();
  });
});
