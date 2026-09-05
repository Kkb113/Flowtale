export const DB_NAME = 'screensDB';
export const OBJECT_STORE = 'screensDataStore';
export const OBJECT_KEY = 'id';
export const OBJECT_KEY_VALUE = '1';

const DATABASE_TIMEOUT_MS = 30000;

export function openDb(dbName: string, storeName: string, v: number, keyPath: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(dbName, v);
    let settled = false;
    const fail = (error: Error) => {
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(
      () => fail(new Error('Capture storage timed out. Close other demo tabs and retry.')),
      DATABASE_TIMEOUT_MS
    );

    openRequest.onupgradeneeded = () => {
      if (settled) {
        openRequest.transaction?.abort();
        return;
      }
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath });
      }
    };
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      if (settled) {
        db.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      db.onversionchange = () => db.close();
      resolve(db);
    };
    openRequest.onerror = () => fail(openRequest.error || new Error('Unable to open capture storage'));
    openRequest.onblocked = () => fail(new Error('Capture storage is blocked. Close other demo tabs and retry.'));
  });
}

/** A successful request is not durable until its enclosing transaction commits. */
export function runDbRequest<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  request: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const timer = setTimeout(() => {
      try { transaction.abort(); } catch { /* The transaction may already have finished. */ }
      reject(new Error('Capture storage transaction timed out. Your recording has not been discarded.'));
    }, DATABASE_TIMEOUT_MS);
    const fail = () => {
      clearTimeout(timer);
      reject(transaction.error || new Error('Capture storage transaction failed. Retry or free browser storage.'));
    };
    transaction.onabort = fail;
    transaction.onerror = fail;
    try {
      const operation = request(transaction.objectStore(storeName));
      operation.onerror = () => {
        clearTimeout(timer);
        reject(operation.error || new Error('Capture storage request failed'));
      };
      transaction.oncomplete = () => {
        clearTimeout(timer);
        resolve(operation.result);
      };
    } catch (error) {
      clearTimeout(timer);
      try { transaction.abort(); } catch { /* Already inactive. */ }
      reject(error);
    }
  });
}

export async function putDataInDb(db: IDBDatabase, storeName: string, data: DBData): Promise<DBData> {
  await runDbRequest(db, storeName, 'readwrite', store => store.put(data));
  return data;
}
export interface DBData {
  captureSessionId?: string;
  id: string;
  screensData: string;
  cookies: string;
  screenStyleData: string;
  version: string;
}
