import React from 'react';
import { Alert, Button, Progress } from 'antd';
import { openDb, DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE } from '@fable/common/dist/db-utils';
import { commitCapture } from '@fable/common/dist/capture-storage';
import * as Tags from './styled';
import FableLogo from '../../assets/fable-logo-2.svg';

interface Props { title: string }
interface State { progressPercent: number; error: string | null }

/** Watches the extension's small status messages; recording bytes never enter React state. */
export class PrepTour extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { progressPercent: 0, error: null };
  }

  private observer: MutationObserver | null = null;

  private deadline: ReturnType<typeof setTimeout> | null = null;

  private active = false;

  private importingLegacy = false;

  private lastReceived = -1;

  componentDidMount(): void {
    this.active = true;
    document.title = this.props.title;
    this.observer = new MutationObserver(this.readStatus);
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    this.resetDeadline();
    this.readStatus();
  }

  componentWillUnmount(): void {
    this.active = false;
    this.stopWatching();
  }

  private stopWatching(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.deadline) clearTimeout(this.deadline);
    this.deadline = null;
  }

  private resetDeadline(): void {
    if (this.deadline) clearTimeout(this.deadline);
    this.deadline = setTimeout(() => this.fail(
      'The extension stopped responding. Keep this recording tab open, check that the Fable extension is enabled, and retry.'
    ), 60000);
  }

  private fail = (error: string): void => {
    if (!this.active) return;
    this.stopWatching();
    this.setState({ error });
  };

  private finish = (): void => {
    if (!this.active) return;
    this.active = false;
    this.stopWatching();
    const capture = new URLSearchParams(window.location.search).get('capture');
    window.location.replace(`/create-interactive-demo${capture ? `?capture=${encodeURIComponent(capture)}` : ''}`);
  };

  private readStatus = (): void => {
    if (!this.active || this.state.error) return;
    const text = (id: string): string => document.getElementById(id)?.textContent || '';
    const error = text('capture-transfer-error');
    if (error) { this.fail(error); return; }
    const total = Number(text('total-screen-count'));
    const received = Number(text('number-of-screens-received-count'));
    if (Number.isSafeInteger(total) && total > 0 && Number.isSafeInteger(received) && received >= 0) {
      if (received > this.lastReceived) {
        this.lastReceived = received;
        this.resetDeadline();
      }
      const progressPercent = Math.min(95, Math.round((received / total) * 95));
      if (progressPercent !== this.state.progressPercent) {
        this.setState({ progressPercent });
      }
    }
    if (text('redirect-ready') === '1') { this.finish(); return; }
    // Supported v2 extensions write the complete payload once. v3/v4 commit to IndexedDB themselves.
    const screensData = text('exchange-data');
    if (screensData && !this.importingLegacy) {
      this.importingLegacy = true;
      this.importLegacy(screensData, text('screen-style-data'), text('version-data')).catch(cause => {
        this.fail(cause instanceof Error ? cause.message : 'The recording could not be stored. Retry the transfer.');
      });
    }
  };

  private async importLegacy(screensData: string, screenStyleData: string, version: string): Promise<void> {
    const screens = JSON.parse(screensData);
    if (!Array.isArray(screens) || !screens.length) throw new Error('The recording contains no screens.');
    const db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
    try {
      await commitCapture(db, { id: OBJECT_KEY_VALUE,
        screensData,
        screenStyleData,
        cookies: '[]',
        version: version || '1' });
    } finally { db.close(); }
    this.finish();
  }

  render(): React.ReactElement {
    return (
      <Tags.HeartLoaderCon>
        <img src={FableLogo} alt="Fable" style={{ height: '50px', width: '50px', margin: 'auto' }} />
        {this.state.error ? (
          <>
            <Alert type="error" showIcon message="Recording transfer paused" description={this.state.error} />
            <Button type="primary" onClick={() => window.location.reload()}>Retry transfer</Button>
            <Button href="/create-interactive-demo">Open previously received recording</Button>
          </>
        ) : <Progress strokeColor="#7567ff" status="active" percent={this.state.progressPercent} />}
      </Tags.HeartLoaderCon>
    );
  }
}

export default PrepTour;
