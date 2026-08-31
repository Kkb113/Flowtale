import { getRandomId } from '@fable/common/dist/utils';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { isApiConflict } from '@fable/common/dist/api';

export enum SyncTarget {
  LocalStorage,
}

interface CB {
  onSyncNeeded: <T extends Record<string, any>>(
    key: string,
    value: T,
    expectedRevision?: number
  ) => Promise<SyncAcknowledgement | void>;
  onStatusChange?: (status: SyncStatus) => void;
  onAcknowledged?: (key: string, acknowledgement: SyncAcknowledgement) => void;
}

export interface SyncAcknowledgement {
  revision?: number;
}

interface JournalEntry<T> {
  __fableJournalVersion: 1;
  value: T;
  expectedRevision?: number;
}

function isJournalEntry<T>(value: T | JournalEntry<T>): value is JournalEntry<T> {
  return !!value
    && typeof value === 'object'
    && '__fableJournalVersion' in value
    && value.__fableJournalVersion === 1;
}

function readJournalEntry<T>(serialized: string): {value: T, expectedRevision?: number} {
  const parsed = JSON.parse(serialized) as T | JournalEntry<T>;
  if (isJournalEntry(parsed)) {
    return { value: parsed.value, expectedRevision: parsed.expectedRevision };
  }
  return { value: parsed };
}

function writeJournalEntry<T>(value: T, expectedRevision?: number): string {
  if (expectedRevision === undefined) return JSON.stringify(value);
  const entry: JournalEntry<T> = {
    __fableJournalVersion: 1,
    value,
    expectedRevision,
  };
  return JSON.stringify(entry);
}

export type SyncStatusType = 'idle' | 'saving' | 'saved' | 'retrying' | 'conflict';

export interface SyncStatus {
  type: SyncStatusType;
  key?: string;
  attempt?: number;
  error?: Error;
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
  private readonly lookupKeys: Record<string, 1> = {};

  private readonly lookupKeyLike: string;

  private readonly interval: number;

  private timer: number = 0;

  private isStarted: boolean = false;

  private readonly cb: CB;

  private isPolling = false;

  private readonly retries: Record<string, {attempt: number, nextAttemptAt: number}> = {};

  private readonly conflicts: Record<string, 1> = {};

  constructor(target: SyncTarget, lookupKeyLike: string, cb: CB, pollingInterval = 3000) {
    if (target !== SyncTarget.LocalStorage) throw new Error(`Unsupported sync target: ${target}`);
    this.interval = pollingInterval;
    this.cb = cb;
    this.lookupKeyLike = lookupKeyLike;
  }

  add<K, T>(
    key: string,
    value: T,
    updateFn: (storedVal: K | null, v: T) => K,
    tx?: Tx,
    expectedRevision?: number
  ): K | null {
    const origKey = key;
    if (tx) {
      key = `tx/${key}`;
    } else if (!(key in this.lookupKeys)) {
      this.lookupKeys[key] = 1;
    }
    delete this.conflicts[origKey];
    delete this.retries[origKey];

    const storedVal = localStorage.getItem(key);
    const storedEntry = storedVal === null ? null : readJournalEntry<K>(storedVal);
    const newVal = updateFn(storedEntry?.value ?? null, value);
    localStorage.setItem(key, writeJournalEntry(newVal, storedEntry?.expectedRevision ?? expectedRevision));
    if (tx) {
      tx.onFinish(this.onTxFinish, [key, origKey, updateFn]);
      return null;
    }
    return newVal;
  }

  // eslint-disable-next-line class-methods-use-this
  onTxFinish = <K>(tx: Tx, stagingKey: string, origKey: string, mergeFn: (storedVal: K | null, v: K) => K): void => {
    const storedStagingVal = readJournalEntry<K>(localStorage.getItem(stagingKey)!);
    localStorage.removeItem(stagingKey);

    if (!(origKey in this.lookupKeys)) this.lookupKeys[origKey] = 1;

    const storedVal = localStorage.getItem(origKey);
    const storedEntry = storedVal === null ? null : readJournalEntry<K>(storedVal);
    const mergedVal = mergeFn(storedEntry?.value ?? null, storedStagingVal.value);

    localStorage.setItem(
      origKey,
      writeJournalEntry(mergedVal, storedEntry?.expectedRevision ?? storedStagingVal.expectedRevision)
    );
    tx.setData(mergedVal);
  };

  startIfNotAlreadyStarted<K>(onLocalEditsLeft: (key: string, v: K) => void): void {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    if (!this.timer) {
      this.timer = window.setInterval(() => { this.poll(); }, this.interval);
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
          try {
            const entry = readJournalEntry<K>(val);
            onLocalEditsLeft(key, entry.value);
          } catch (error) {
            this.setStatus({ type: 'retrying', key, attempt: 0, error: error as Error });
          }
        }
      }
    }
  }

  private setStatus(status: SyncStatus): void {
    this.cb.onStatusChange?.(status);
  }

  rebaseExpectedRevisions(predicate: (key: string) => boolean, revision: number): void {
    Object.keys(this.lookupKeys).filter(predicate).forEach(key => {
      const serialized = localStorage.getItem(key);
      if (!serialized) return;
      const entry = readJournalEntry<Record<string, any>>(serialized);
      localStorage.setItem(key, writeJournalEntry(entry.value, revision));
    });
  }

  poll = async (): Promise<void> => {
    if (this.isPolling) return;
    this.isPolling = true;
    for (const key of Object.keys(this.lookupKeys)) {
      if (this.conflicts[key]) continue;
      const retry = this.retries[key];
      if (retry && retry.nextAttemptAt > Date.now()) continue;
      const val = localStorage.getItem(key);
      if (!val) {
        delete this.lookupKeys[key];
        delete this.retries[key];
        continue;
      }

      try {
        const entry = readJournalEntry<Record<string, any>>(val);
        this.setStatus({ type: 'saving', key, attempt: (retry?.attempt || 0) + 1 });
        const acknowledgement = await this.cb.onSyncNeeded(key, entry.value, entry.expectedRevision);
        if (localStorage.getItem(key) === val) {
          localStorage.removeItem(key);
          delete this.lookupKeys[key];
        } else if (acknowledgement?.revision !== undefined) {
          const pendingEntry = readJournalEntry<Record<string, any>>(localStorage.getItem(key)!);
          localStorage.setItem(key, writeJournalEntry(pendingEntry.value, acknowledgement.revision));
        }
        if (acknowledgement) this.cb.onAcknowledged?.(key, acknowledgement);
        delete this.retries[key];
        this.setStatus({ type: 'saved', key });
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        if (isApiConflict(error)) {
          this.conflicts[key] = 1;
          this.setStatus({ type: 'conflict', key, error: typedError });
        } else {
          const attempt = (retry?.attempt || 0) + 1;
          this.retries[key] = {
            attempt,
            nextAttemptAt: Date.now() + Math.min(this.interval * (2 ** (attempt - 1)), 30000),
          };
          this.setStatus({ type: 'retrying', key, attempt, error: typedError });
        }
        break;
      }
    }
    this.isPolling = false;
    if (Object.keys(this.lookupKeys).length === 0) this.setStatus({ type: 'idle' });
  };

  end(): Promise<void> {
    clearInterval(this.timer);
    this.timer = 0;
    return this.poll();
  }
}
