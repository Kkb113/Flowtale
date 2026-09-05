import { runDbRequest } from './db-utils';

function fixture() {
  const operation = { result: 'capture-1', error: null } as unknown as IDBRequest<string>;
  const transaction = {
    objectStore: jest.fn(),
    abort: jest.fn(),
    error: null,
  } as unknown as IDBTransaction;
  const db = { transaction: () => transaction } as unknown as IDBDatabase;
  return { operation, transaction, db };
}

describe('capture storage acknowledgement', () => {
  it('waits for commit even when the put has already succeeded', async () => {
    const { operation, transaction, db } = fixture();
    let acknowledged = false;
    const write = runDbRequest(db, 'captures', 'readwrite', () => operation)
      .then(result => { acknowledged = true; return result; });
    await Promise.resolve();
    expect(acknowledged).toBe(false);
    transaction.oncomplete!.call(transaction, {} as Event);
    await expect(write).resolves.toBe('capture-1');
  });

  it('rejects a transaction abort after a successful put', async () => {
    const { operation, transaction, db } = fixture();
    const write = runDbRequest(db, 'captures', 'readwrite', () => operation);
    transaction.onabort!.call(transaction, {} as Event);
    await expect(write).rejects.toThrow('transaction failed');
  });

  it('aborts and rejects a transaction that never completes', async () => {
    jest.useFakeTimers();
    try {
      const { operation, transaction, db } = fixture();
      const write = runDbRequest(db, 'captures', 'readwrite', () => operation);
      const assertion = expect(write).rejects.toThrow('timed out');
      jest.advanceTimersByTime(30000);
      await assertion;
      expect(transaction.abort).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
