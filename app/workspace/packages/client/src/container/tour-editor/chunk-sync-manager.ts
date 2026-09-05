import { getRandomId } from '@fable/common/dist/utils';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { isApiConflict } from '@fable/common/dist/api';

export enum SyncTarget {
  LocalStorage,
}

interface CB {
  acceptsKey?: (key: string) => boolean;
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

export interface JournalSnapshot {
  key: string;
  targetKey: string;
  serialized: string;
  value?: Record<string, any>;
  expectedRevision?: number;
  kind: 'pending' | 'conflict' | 'staged' | 'invalid';
}

interface JournalEntry<T> {
  __fableJournalVersion: 1;
  value: T;
  expectedRevision?: number;
  conflicted?: boolean;
}

function isJournalEntry<T>(value: T | JournalEntry<T>): value is JournalEntry<T> {
  return !!value
    && typeof value === 'object'
    && '__fableJournalVersion' in value
    && value.__fableJournalVersion === 1;
}

function readJournalEntry<T>(serialized: string): {value: T, expectedRevision?: number, conflicted?: boolean} {
  const parsed = JSON.parse(serialized) as T | JournalEntry<T>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid browser changes');
  if (isJournalEntry(parsed)) {
    if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) throw new Error('Invalid browser changes');
    if (parsed.expectedRevision !== undefined
      && (!Number.isSafeInteger(parsed.expectedRevision) || parsed.expectedRevision < 0)) {
      throw new Error('Invalid browser save revision');
    }
    if (parsed.conflicted !== undefined && typeof parsed.conflicted !== 'boolean') {
      throw new Error('Invalid browser conflict state');
    }
    return { value: parsed.value, expectedRevision: parsed.expectedRevision, conflicted: parsed.conflicted };
  }
  if ('__fableJournalVersion' in parsed) throw new Error('These browser changes require a newer application version');
  return { value: parsed };
}

function writeJournalEntry<T>(value: T, expectedRevision?: number, conflicted?: boolean): string {
  if (expectedRevision === undefined && !conflicted) return JSON.stringify(value);
  const entry: JournalEntry<T> = {
    __fableJournalVersion: 1,
    value,
    expectedRevision,
    ...(conflicted ? { conflicted: true } : {}),
  };
  return JSON.stringify(entry);
}

export type SyncStatusType = 'idle' | 'saving' | 'saved' | 'retrying' | 'conflict' | 'recovery';

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

type TxFn = (tx: Tx, ...args: any[]) => void;
export class Tx {
  private txState = TxState.Created;

  readonly uuid = getRandomId();

  private ls: Array<{ fn: TxFn, args: any[], key: unknown }> = [];

  private data: unknown | null = null;

  onFinish(fn: TxFn, args: any[], key: unknown = fn): () => void {
    if (this.txState === TxState.Completed) throw new Error('Transaction is already complete');
    const existing = this.ls.find(listener => listener.key === key);
    const listener = existing || { fn, args, key };
    listener.fn = fn;
    listener.args = args;
    if (!existing) this.ls.push(listener);
    return () => {
      const index = this.ls.indexOf(listener);
      if (index !== -1) this.ls.splice(index, 1);
    };
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
    // Failed promotion remains retryable; already completed callbacks are never replayed.
    while (this.ls.length) {
      const listener = this.ls[0];
      listener.fn(this, ...listener.args);
      this.ls.shift();
    }
    this.txState = TxState.Completed;
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

  private activePoll: Promise<void> | null = null;

  private paused = false;

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
      key = `tx/${tx.uuid}/${key}`;
    } else if (!(key in this.lookupKeys)) {
      this.lookupKeys[key] = 1;
    }
    // Typing is not conflict resolution, and must not bypass retry backoff.

    const storedVal = localStorage.getItem(key);
    const storedEntry = storedVal === null ? null : readJournalEntry<K>(storedVal);
    const newVal = updateFn(storedEntry?.value ?? null, value);
    localStorage.setItem(key, writeJournalEntry(newVal, storedEntry?.expectedRevision ?? expectedRevision, storedEntry?.conflicted));
    if (tx) {
      tx.onFinish(this.onTxFinish, [key, origKey, updateFn], key);
      return null;
    }
    return newVal;
  }

  // eslint-disable-next-line class-methods-use-this
  onTxFinish = <K>(tx: Tx, stagingKey: string, origKey: string, mergeFn: (storedVal: K | null, v: K) => K): void => {
    const storedStagingVal = readJournalEntry<K>(localStorage.getItem(stagingKey)!);

    if (!(origKey in this.lookupKeys)) this.lookupKeys[origKey] = 1;

    const storedVal = localStorage.getItem(origKey);
    const storedEntry = storedVal === null ? null : readJournalEntry<K>(storedVal);
    const mergedVal = mergeFn(storedEntry?.value ?? null, storedStagingVal.value);

    localStorage.setItem(
      origKey,
      writeJournalEntry(
        mergedVal,
        storedEntry?.expectedRevision ?? storedStagingVal.expectedRevision,
        storedEntry?.conflicted || storedStagingVal.conflicted
      )
    );
    // Quota/storage failures must leave the recoverable staging entry intact.
    localStorage.removeItem(stagingKey);
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
      if (key.startsWith(this.lookupKeyLike) && (this.cb.acceptsKey?.(key) ?? true)) {
        const val = localStorage.getItem(key);
        if (!val) {
          localStorage.removeItem(key);
        } else {
          this.lookupKeys[key] = 1;
          try {
            const entry = readJournalEntry<K>(val);
            onLocalEditsLeft(key, entry.value);
            if (entry.conflicted) {
              this.conflicts[key] = 1;
              this.setStatus({ type: 'conflict', key });
            }
          } catch (error) {
            this.setStatus({ type: 'retrying', key, attempt: 0, error: error as Error });
          }
        }
      }
    }
    if (this.getPendingEntries().some(entry => entry.kind === 'staged' || entry.kind === 'invalid')) {
      this.setStatus({ type: 'recovery' });
    }
  }

  getPendingEntries(): JournalSnapshot[] {
    const entries: JournalSnapshot[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      // Both legacy tx/<key> and isolated tx/<transaction>/<key> staging are recoverable.
      const prefixIndex = key.startsWith('tx/') ? key.indexOf(`${this.lookupKeyLike}/`, 3) : 0;
      const targetKey = prefixIndex >= 0 ? key.slice(prefixIndex) : '';
      if (!targetKey.startsWith(`${this.lookupKeyLike}/`) || !(this.cb.acceptsKey?.(targetKey) ?? true)) continue;
      const serialized = localStorage.getItem(key);
      if (serialized === null) continue;
      try {
        const entry = readJournalEntry<Record<string, any>>(serialized);
        if (!entry.value || typeof entry.value !== 'object' || Array.isArray(entry.value)) throw new Error('Invalid journal');
        entries.push({ key,
          targetKey,
          serialized,
          value: entry.value,
          expectedRevision: entry.expectedRevision,
          kind: key !== targetKey ? 'staged' : entry.conflicted ? 'conflict' : 'pending' });
      } catch {
        entries.push({ key, targetKey, serialized, kind: 'invalid' });
      }
    }
    return entries;
  }

  replayPending<K>(accepts: (key: string) => boolean, onLocalEditsLeft: (key: string, value: K) => void): void {
    for (const entry of this.getPendingEntries()) {
      if (entry.key === entry.targetKey && entry.value && accepts(entry.key)) {
        onLocalEditsLeft(entry.key, entry.value as K);
      }
    }
  }

  async pause(): Promise<void> {
    this.paused = true;
    await this.activePoll;
  }

  resume(): void { this.paused = false; }

  private assertUnchanged(snapshot: JournalSnapshot): void {
    if (!(this.cb.acceptsKey?.(snapshot.targetKey) ?? true)
      || localStorage.getItem(snapshot.key) !== snapshot.serialized) {
      throw new Error('These browser changes have changed. Review them again before continuing.');
    }
  }

  discardReviewed(snapshot: JournalSnapshot): void {
    if (!this.paused) throw new Error('Pause saving before resolving browser changes');
    this.assertUnchanged(snapshot);
    localStorage.removeItem(snapshot.key);
    delete this.lookupKeys[snapshot.key];
    delete this.conflicts[snapshot.key];
    delete this.retries[snapshot.key];
  }

  async saveReviewed(snapshot: JournalSnapshot, save: () => Promise<void>): Promise<void> {
    if (!this.paused) throw new Error('Pause saving before resolving browser changes');
    this.assertUnchanged(snapshot);
    await save();
    // A later browser edit must survive an older acknowledgement, including another tab's write.
    if (localStorage.getItem(snapshot.key) === snapshot.serialized) this.discardReviewed(snapshot);
  }

  private setStatus(status: SyncStatus): void {
    this.cb.onStatusChange?.(status);
  }

  rebaseExpectedRevisions(predicate: (key: string) => boolean, revision: number): void {
    Object.keys(this.lookupKeys).filter(predicate).forEach(key => {
      if (this.conflicts[key]) return;
      const serialized = localStorage.getItem(key);
      if (!serialized) return;
      const entry = readJournalEntry<Record<string, any>>(serialized);
      if (entry.conflicted) return;
      localStorage.setItem(key, writeJournalEntry(entry.value, revision));
    });
  }

  poll = (): Promise<void> => {
    if (!this.activePoll) {
      this.activePoll = this.flush().finally(() => { this.activePoll = null; });
    }
    return this.activePoll;
  };

  private async flush(): Promise<void> {
    for (const key of Object.keys(this.lookupKeys)) {
      if (this.paused) break;
      if (!(this.cb.acceptsKey?.(key) ?? true)) continue;
      if (this.conflicts[key]) continue;
      const retry = this.retries[key];
      if (retry && retry.nextAttemptAt > Date.now()) continue;
      try {
        const val = localStorage.getItem(key);
        if (!val) {
          delete this.lookupKeys[key];
          delete this.retries[key];
          continue;
        }
        const entry = readJournalEntry<Record<string, any>>(val);
        if (entry.conflicted) {
          this.conflicts[key] = 1;
          this.setStatus({ type: 'conflict', key });
          continue;
        }
        this.setStatus({ type: 'saving', key, attempt: (retry?.attempt || 0) + 1 });
        const acknowledgement = await this.cb.onSyncNeeded(key, entry.value, entry.expectedRevision);
        if (localStorage.getItem(key) === val) {
          localStorage.removeItem(key);
          delete this.lookupKeys[key];
        } else if (acknowledgement?.revision !== undefined) {
          const pending = localStorage.getItem(key);
          if (pending) {
            const pendingEntry = readJournalEntry<Record<string, any>>(pending);
            if (!pendingEntry.conflicted) {
              localStorage.setItem(key, writeJournalEntry(pendingEntry.value, acknowledgement.revision));
            }
          }
        }
        if (acknowledgement) this.cb.onAcknowledged?.(key, acknowledgement);
        delete this.retries[key];
        this.setStatus({ type: 'saved', key });
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        if (isApiConflict(error)) {
          this.conflicts[key] = 1;
          try {
            const pending = localStorage.getItem(key);
            if (pending) {
              const entry = readJournalEntry<Record<string, any>>(pending);
              localStorage.setItem(key, writeJournalEntry(entry.value, entry.expectedRevision, true));
            }
          } catch (storageError) {
            this.setStatus({ type: 'retrying', key, error: storageError as Error });
          }
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
    if (Object.keys(this.lookupKeys).length === 0) this.setStatus({ type: 'idle' });
  }

  end(): Promise<void> {
    clearInterval(this.timer);
    this.timer = 0;
    this.isStarted = false;
    return this.poll();
  }
}
