import { getRandomId } from '@fable/common/dist/utils';
import raiseDeferredError from '@fable/common/dist/deferred-error';

export enum SyncTarget {
  LocalStorage,
}

interface CB {
  onSyncNeeded: <T extends Record<string, any>>(key: string, value: T) => void;
}

const enum TxState {
  Created = 1,
  InProgress,
  Completed
}

type TxFn = (Function & { __fid__?: string});
export class Tx {
  private txState = TxState.Created;

  readonly uuid = getRandomId();

  private ls: Array<[TxFn, any[]]> = [];

  private data: unknown | null = null;

  onFinish(f: TxFn, args: any[]): () => void {
    if (!f.__fid__) {
      f.__fid__ = getRandomId();
    }
    const ii = this.ls.findIndex(lfn => lfn[0].__fid__ === f.__fid__);
    if (ii === -1) {
      const i = this.ls.push([f, args]);
      return () => this.ls.splice(i - 1, 1);
    }
    return () => this.ls.splice(ii, 1);
  }

  start(): Tx {
    if (this.txState === TxState.Completed) {
      raiseDeferredError(new Error('Attempting to restart a completed transaction'));
      return this;
    }
    this.txState = TxState.InProgress;
    return this;
  }

  setData(d: unknown): Tx {
    this.data = d;
    return this;
  }

  getData(): unknown {
    return this.data;
  }

  end(): Tx {
    this.txState = TxState.Completed;
    this.ls.forEach(f => f[0](this, ...f[1]));
    this.ls.length = 0;
    return this;
  }
}

export default class ChunkSyncManager {
  private readonly target: SyncTarget;

  private readonly lookupKeys: Record<string, 1> = {};

  private readonly lookupKeyLike: string;

  private readonly interval: number;

  private timer: number = 0;

  private isStarted: boolean = false;

  private readonly cb: CB;

  constructor(target: SyncTarget, lookupKeyLike: string, cb: CB, pollingInterval = 3000) {
    this.target = target;
    this.interval = pollingInterval;
    this.cb = cb;
    this.lookupKeyLike = lookupKeyLike;
  }

  add<K, T>(key: string, value: T, updateFn: (storedVal: K | null, v: T) => K, tx?: Tx): K | null {
    const origKey = key;
    if (tx) {
      key = `tx/${key}`;
    } else if (!(key in this.lookupKeys)) {
      this.lookupKeys[key] = 1;
    }

    const storedVal = localStorage.getItem(key);
    const newVal = updateFn(storedVal === null ? null : JSON.parse(storedVal), value);
    localStorage.setItem(key, JSON.stringify(newVal));
    if (tx) {
      tx.onFinish(this.onTxFinish, [key, origKey, updateFn]);
      return null;
    }
    return newVal;
  }

  // eslint-disable-next-line class-methods-use-this
  onTxFinish = (tx: Tx, stagingKey: string, origKey: string, mergeFn: <K, T>(storedVal: K | null, v: T) => K): void => {
    const storedStagingVal = JSON.parse(localStorage.getItem(stagingKey)!);
    localStorage.removeItem(stagingKey);

    if (!(origKey in this.lookupKeys)) this.lookupKeys[origKey] = 1;

    const storedVal = localStorage.getItem(origKey);
    const mergedVal = mergeFn(storedVal === null ? null : JSON.parse(storedVal), storedStagingVal);

    localStorage.setItem(origKey, JSON.stringify(mergedVal));
    tx.setData(mergedVal);
  };

  startIfNotAlreadyStarted<K>(onLocalEditsLeft: (key: string, v: K) => void): void {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    if (!this.timer) {
      this.timer = setInterval(this.poll, this.interval) as unknown as number;
    }
    let len = localStorage.length;
    while (len--) {
      const key = localStorage.key(len);
      if (!key) break;
      if (key.startsWith(this.lookupKeyLike)) {
        const val = localStorage.getItem(key);
        if (!val) {
          localStorage.removeItem(key);
        } else {
          this.lookupKeys[key] = 1;
          const parsedVal = JSON.parse(val) as K;
          // TODO report this data to sentry
          console.info('Trying to flush cached edit', key, JSON.parse(val));
          onLocalEditsLeft(key, parsedVal);
          localStorage.removeItem(key);
          delete this.lookupKeys[key];
        }
      }
    }
  }

  // TODO this function does not wait to check if the server has failed to receive the data
  //      Edits could be lost when there if the server is not available
  poll = (): void => {
    for (const key of Object.keys(this.lookupKeys)) {
      const val = localStorage.getItem(key);
      if (val) {
        this.cb.onSyncNeeded(key, JSON.parse(val));
      }
      localStorage.removeItem(key);
      delete this.lookupKeys[key];
    }
  };

  end(): void {
    clearInterval(this.timer);
    this.timer = 0;
    this.poll();
  }
}
