import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Space, Table } from 'antd';
import { RespCommonConfig } from '@fable/common/dist/api-contract';
import { IGlobalConfig } from '@fable/common/dist/types';
import { isApiConflict } from '@fable/common/dist/api';
import ChunkSyncManager, { JournalSnapshot, SyncStatus } from './chunk-sync-manager';
import { loadSaveReview, SaveReview } from './save-recovery';

function showValue(value: unknown): React.ReactNode {
  if (value === undefined) return <em>Absent</em>;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 180, overflow: 'auto' }}>{text}</pre>;
}

function downloadRecovery(entries: JournalSnapshot[]): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, entries }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fable-unsaved-changes.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SaveRecoveryPanel({ manager, status, config, global }: {
  manager: ChunkSyncManager; status: SyncStatus | null; config: RespCommonConfig; global: IGlobalConfig;
}): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<JournalSnapshot[]>([]);
  const [selected, setSelected] = useState<JournalSnapshot | null>(null);
  const [review, setReview] = useState<SaveReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [discarding, setDiscarding] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; manager.resume(); }, [manager]);
  const close = (): void => {
    generation.current += 1;
    setOpen(false);
    manager.resume();
  };
  const refresh = (): void => {
    setEntries(manager.getPendingEntries());
    setSelected(null);
    setReview(null);
    setDiscarding(false);
  };
  const begin = async (): Promise<void> => {
    const request = ++generation.current;
    setOpen(true);
    setBusy(true);
    setError('');
    try {
      await manager.pause();
      if (generation.current === request) refresh();
    } catch { setError('Browser storage is unavailable. Keep this tab open and try again.'); } finally { if (generation.current === request) setBusy(false); }
  };
  const select = async (entry: JournalSnapshot): Promise<void> => {
    const request = ++generation.current;
    setSelected(entry);
    setReview(null);
    setDiscarding(false);
    setBusy(true);
    setError('');
    try {
      const loaded = await loadSaveReview(entry, config, global);
      if (generation.current === request) setReview(loaded);
    } catch (failure) {
      if (generation.current === request) setError((failure as Error).message);
    } finally { if (generation.current === request) setBusy(false); }
  };
  const resolve = async (discard: boolean): Promise<void> => {
    if (!selected || (!discard && !review)) return;
    setBusy(true);
    setError('');
    try {
      if (discard) manager.discardReviewed(selected);
      else await manager.saveReviewed(selected, review!.save);
      // Reload acknowledged Redux state. Every other journal stays durable and recoverable.
      window.location.reload();
    } catch (failure) {
      setError(isApiConflict(failure)
        ? 'The saved version changed again. Load the comparison again before applying your changes.'
        : (failure as Error).message);
      setReview(null);
      setBusy(false);
    }
  };
  const needsAttention = status && ['conflict', 'retrying', 'recovery'].includes(status.type);
  if (!needsAttention && !open) return null;
  return (
    <>
      <Alert
        style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1200 }}
        type="warning"
        showIcon
        message="Some changes have not been saved"
        description="Your browser copy is retained. Review it alongside the saved version to recover or discard it."
        action={<Button onClick={() => { begin(); }}>Review unsaved changes</Button>}
      />
      <Modal
        title="Review unsaved changes"
        open={open}
        width={1000}
        zIndex={1300}
        onCancel={close}
        closable={!busy}
        maskClosable={!busy}
        keyboard={!busy}
        footer={<Button disabled={busy} onClick={close}>Keep changes for later</Button>}
      >
        {error && <Alert role="alert" type="error" message={error} />}
        <p>Applying browser changes replaces the fields shown below in the latest saved version. Other sessions must review any resulting conflicts.</p>
        <Space wrap>
          <Button disabled={!entries.length || busy} onClick={() => downloadRecovery(entries)}>Download recovery copy</Button>
          <Button disabled={busy} onClick={refresh}>Refresh browser changes</Button>
        </Space>
        <ul>{entries.map(entry => (
          <li key={entry.key}>
            <Button type="link" disabled={busy} onClick={() => { select(entry); }}>
              {entry.targetKey.includes('/loader/') ? 'Loading screen' : entry.targetKey.includes('/editchunk/') ? 'Screen content' : entry.targetKey.includes('/globaleditchunk/') ? 'Content across screens' : 'Demo structure and appearance'}
              {entry.kind === 'staged' ? ' — interrupted edit' : entry.kind === 'invalid' ? ' — unreadable browser copy' : ''}
            </Button>
          </li>
        ))}
        </ul>
        {!entries.length && !busy && <p>No unsaved browser changes remain.</p>}
        {busy && <p role="status">Loading or saving changes…</p>}
        {review && (
        <>
          <h3>{review.name}</h3>
          <Table
            rowKey="field"
            size="small"
            dataSource={review.differences}
            pagination={{ pageSize: 10 }}
            columns={[{ title: 'Changed field', dataIndex: 'field' },
              { title: 'Saved version', dataIndex: 'saved', render: showValue },
              { title: 'Browser changes', dataIndex: 'proposed', render: showValue }]}
          />
          {!review.differences.length && <p>The browser changes already match the saved version.</p>}
          <Button type="primary" disabled={busy} onClick={() => { resolve(false); }}>Apply reviewed changes</Button>
        </>
        )}
        {selected && (
        <div style={{ marginTop: 16 }}>
          {discarding ? (
            <>
              <p>Discard this browser copy and reload the saved version? This cannot be undone. Download a recovery copy first if you need it.</p>
              <Button danger disabled={busy} onClick={() => { resolve(true); }}>Confirm discard browser changes</Button>
              <Button disabled={busy} onClick={() => setDiscarding(false)}>Cancel discard</Button>
            </>
          ) : <Button danger disabled={busy} onClick={() => setDiscarding(true)}>Discard selected browser changes</Button>}
        </div>
        )}
      </Modal>
    </>
  );
}
