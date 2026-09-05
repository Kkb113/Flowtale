import api from '@fable/common/dist/api';
import { openDb, runDbRequest } from '@fable/common/dist/db-utils';

const STORE = 'checkpoints';

/** Capture-scoped committed checkpoints. Never store access tokens or signed upload URLs. */
export class CreationJournal {
  // TypeScript parameter properties initialize the journal's storage and scope.
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(
    private readonly db: IDBDatabase,
    private readonly scope: string,
    private readonly capture: string,
    private readonly assertContext: () => void,
  ) { /* Parameter properties retain the scoped storage handle. */ }

  static async open(principal: number, workspace: string, capture: string, fingerprint: string, assertContext: () => void)
    : Promise<CreationJournal> {
    const db = await openDb('fable-creation-recovery', STORE, 1, 'id');
    try {
      assertContext();
      const owner = `${principal}/${workspace}`;
      const binding = await runDbRequest(db, STORE, 'readwrite', store => {
        const request = store.get(`capture/${capture}`);
        request.onsuccess = () => {
          if (!request.result) store.put({ id: `capture/${capture}`, owner, fingerprint });
        };
        return request;
      });
      if (binding && (binding.owner !== owner || binding.fingerprint !== fingerprint)) {
        throw new Error('This recording already belongs to another creation session. Return to its original account and workspace to resume.');
      }
      return new CreationJournal(db, `${owner}/${capture}`, capture, assertContext);
    } catch (error) {
      db.close();
      throw error;
    }
  }

  close(): void { this.db.close(); }

  async complete<T>(result: T): Promise<T> {
    const completed = await this.checkpoint('completed', async () => result);
    this.assertContext();
    // Keep a compact acknowledgement for duplicate capture delivery, not captured
    // documents or intermediate request bodies after successful completion.
    await runDbRequest(this.db, STORE, 'readwrite', store => {
      const prefix = `${this.scope}/`;
      const request = store.openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(`${this.scope}/`) && key !== `${this.scope}/completed`) cursor.delete();
        cursor.continue();
      };
      return request;
    });
    return completed;
  }

  async read<T>(key: string): Promise<T | undefined> {
    this.assertContext();
    const row = await runDbRequest(this.db, STORE, 'readonly', store => store.get(`${this.scope}/${key}`));
    return row?.value as T | undefined;
  }

  /** Replace only the rejected append plan; uploaded/copied screens remain reusable. */
  async reviewAppend(intent: unknown): Promise<void> {
    this.assertContext();
    const value = JSON.parse(JSON.stringify(intent));
    const generation = crypto.randomUUID();
    await runDbRequest(this.db, STORE, 'readwrite', store => {
      store.delete(`${this.scope}/document`);
      store.delete(`${this.scope}/request/final-save`);
      store.put({ id: `${this.scope}/final-save-generation`, value: generation });
      return store.put({ id: `${this.scope}/intent`, value });
    });
  }

  async checkpoint<T>(key: string, create: () => Promise<T>): Promise<T> {
    const existing = await this.read<T>(key);
    if (existing !== undefined) return existing;
    const value = JSON.parse(JSON.stringify(await create())) as T;
    this.assertContext();
    await runDbRequest(this.db, STORE, 'readwrite', store => store.put({ id: `${this.scope}/${key}`, value }));
    return value;
  }

  async request<T, R>(key: string, path: string, body: T): Promise<R> {
    // Persist before dispatch. Reprocessing a capture must replay the original bytes,
    // even if proxy URLs or generated annotation IDs have since changed.
    const saved = await this.checkpoint(`request/${key}`, async () => {
      const generation = key === 'final-save' ? await this.read<string>('final-save-generation') : undefined;
      return { path, body, receiptKey: `${this.capture}/${key}${generation ? `/${generation}` : ''}` };
    });
    if (saved.path !== path) throw new Error('The saved creation request does not match this step.');
    this.assertContext();
    return api<T, R>(saved.path, {
      auth: true,
      body: saved.body,
      headers: { 'Idempotency-Key': saved.receiptKey || `${this.capture}/${key}` },
    });
  }
}
