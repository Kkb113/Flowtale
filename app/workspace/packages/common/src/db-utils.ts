export const DB_NAME = 'screensDB';
export const OBJECT_STORE = 'screensDataStore';
export const OBJECT_KEY = 'id';
export const OBJECT_KEY_VALUE = '1';

export function openDb(dbName: string, storeName: string, v: number, keyPath: string):Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(dbName, v);

    openRequest.onupgradeneeded = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath });
      }
    };

    openRequest.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    openRequest.onerror = function (event) {
      reject(new Error('Error opening database'));
    };
  });
}

export function putDataInDb(db: IDBDatabase, storeName: string, data: DBData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    const putRequest = objectStore.put(data);

    Promise.all([
      new Promise(res => {
        transaction.addEventListener('complete', () => {
          res(data);
        });
      }),
      new Promise(res => {
        putRequest.onsuccess = function (event) {
          res(data);
        };
      })
    ]).then(([d]) => {
      resolve(d);
    });

    putRequest.onerror = function (event) {
      reject(new Error('Error putting data in object store'));
    };
  });
}
export interface DBData {
  id: string;
  screensData: string;
  cookies: string;
  screenStyleData: string;
  version: string;
}
