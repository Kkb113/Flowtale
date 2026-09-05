import { DBData, OBJECT_KEY_VALUE, OBJECT_STORE } from './db-utils';

/** A single read/write transaction prevents two recording tabs overwriting each other. */
export function commitCapture(db: IDBDatabase, data: DBData): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OBJECT_STORE, 'readwrite');
    const store = transaction.objectStore(OBJECT_STORE);
    let error: Error | null = null;
    const timer = setTimeout(() => {
      error = new Error('Recording storage timed out. Retry the transfer.');
      try { transaction.abort(); } catch { reject(error); }
    }, 30000);
    transaction.oncomplete = () => { clearTimeout(timer); resolve(); };
    transaction.onabort = transaction.onerror = () => {
      clearTimeout(timer);
      reject(error || transaction.error || new Error('Recording could not be stored. Free browser storage and retry.'));
    };
    const existing = store.get(OBJECT_KEY_VALUE);
    existing.onsuccess = () => {
      const previous = existing.result as DBData | undefined;
      if (previous && (!data.captureSessionId || previous.captureSessionId !== data.captureSessionId)) {
        error = new Error('Another recording is waiting to be saved. Finish that recording, then retry this transfer.');
        transaction.abort();
      } else {
        try { store.put(data); } catch (cause) {
          error = cause instanceof Error ? cause : new Error('Recording could not be stored');
          transaction.abort();
        }
      }
    };
  });
}
