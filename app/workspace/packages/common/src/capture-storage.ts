import { DBData, OBJECT_KEY_VALUE, OBJECT_STORE, runDbRequest } from './db-utils';

const sessionKey = (id: string): string => `capture/${id}`;

/** Resolve a recording without accidentally selecting another tab's unfinished capture. */
export async function readCapture(db: IDBDatabase, id?: string | null): Promise<DBData | undefined> {
  if (id) {
    const scoped = await runDbRequest<DBData | undefined>(db, OBJECT_STORE, 'readonly', store => store.get(sessionKey(id)));
    if (scoped) return scoped;
  }
  const legacy = await runDbRequest<DBData | undefined>(db, OBJECT_STORE, 'readonly', store => store.get(OBJECT_KEY_VALUE));
  return !id || legacy?.captureSessionId === id ? legacy : undefined;
}

/** Store independent recordings atomically while retaining compatibility with the original slot. */
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
    const scoped = store.get(data.captureSessionId ? sessionKey(data.captureSessionId) : OBJECT_KEY_VALUE);
    scoped.onsuccess = () => {
      const existing = store.get(OBJECT_KEY_VALUE);
      existing.onsuccess = () => {
        const previous = existing.result as DBData | undefined;
        if (previous && !data.captureSessionId) {
          error = new Error('Another recording is waiting to be saved. Finish that recording, then retry this transfer.');
          transaction.abort();
        } else {
          const key = data.captureSessionId && (scoped.result || (previous && previous.captureSessionId !== data.captureSessionId))
            ? sessionKey(data.captureSessionId) : OBJECT_KEY_VALUE;
          try { store.put({ ...data, id: key }); } catch (cause) {
            error = cause instanceof Error ? cause : new Error('Recording could not be stored');
            transaction.abort();
          }
        }
      };
    };
  });
}
