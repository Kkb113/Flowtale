import React from 'react';
import { connect } from 'react-redux';
import { startTransaction, captureException } from '@sentry/react';
import { sentryTxReport } from '@fable/common/dist/sentry';
import { Progress } from 'antd';
import { openDb, putDataInDb, DB_NAME, OBJECT_STORE, OBJECT_KEY, OBJECT_KEY_VALUE, DBData } from '@fable/common/dist/db-utils';
import { getDataFromDb } from './db-utils';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import * as Tags from './styled';
import FableLogo from '../../assets/fable-logo-2.svg';

interface IDispatchProps {
}

const mapDispatchToProps = () => ({});

interface IAppStateProps {
}

const mapStateToProps = () => ({});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

type IOwnStateProps = {
  loading: boolean;
  progressPercent: number;
}

class PrepTour extends React.PureComponent<IProps, IOwnStateProps> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = { loading: true, progressPercent: 0 };
  }

  initWaitingLoop() {
    this.timer = setInterval(() => {
      const totalScreenCountEl = document.querySelector('#total-screen-count') as HTMLElement;
      const numberOfScreensReceivedCountEl = document.querySelector('#number-of-screens-received-count') as HTMLElement;

      if (totalScreenCountEl && numberOfScreensReceivedCountEl && this.state.progressPercent < 95) {
        const totalScreenCount = (+totalScreenCountEl.textContent! || 0) + 1;
        const numberOfScreensReceivedCount = +numberOfScreensReceivedCountEl.textContent! || 0;
        const progressPercent = Math.min(Math.round((numberOfScreensReceivedCount / totalScreenCount) * 100), 95);
        this.setState({ progressPercent });
      }

      const redirectReady = document.querySelector('#redirect-ready') as HTMLElement;
      if (redirectReady) {
        this.setState({ progressPercent: 100 });
        window.location.replace('/create-interactive-demo');
      }
    }, 500);
  }

  componentDidMount() {
    document.title = this.props.title;
    this.setState({ loading: true });

    // TODO[compat]: Compatibility code, delete old Compatibility code after a month
    // Before Compatibility: dataversion 2:
    //    Extension inject content script in insolated scope which adds data to dom. If the serialized dom size is too
    //    big then chrome chrashes for not low power devices. This happens since the data is stringified and kept in
    //    dom. This route then load the data in indexeddb.
    this.waitForScreensData();

    // After Compatibility: dataversion 3:
    //    Extension content script directly loads the daata to indexeddb.

    this.initWaitingLoop();
  }

  async waitForScreensData() {
    const db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);

    const intervalId = setInterval(async () => {
      const el = document.querySelector('#exchange-data') as HTMLElement;
      const cookiesEl = document.querySelector('#cookies-data') as HTMLElement;
      const totalScreenCountEl = document.querySelector('#total-screen-count') as HTMLElement;
      const numberOfScreensReceivedCountEl = document.querySelector('#number-of-screens-received-count') as HTMLElement;
      const styleDataEl = document.querySelector('#screen-style-data') as HTMLElement;
      const versionEl = document.querySelector('#version-data') as HTMLElement;

      if (totalScreenCountEl && numberOfScreensReceivedCountEl) {
        const totalScreenCount = +totalScreenCountEl.textContent! || 1;
        const numberOfScreensReceivedCount = +numberOfScreensReceivedCountEl.textContent! || 0;
        const progressPercent = Math.round((numberOfScreensReceivedCount / totalScreenCount) * 100);
        this.setState({ progressPercent });
      }

      if (el && cookiesEl) {
        clearInterval(intervalId);
        const screensData = el.textContent;
        const cookies = cookiesEl.textContent || '';
        const version = versionEl && versionEl.textContent ? versionEl.textContent : '1';
        let screenStyleData = '';
        if (styleDataEl && styleDataEl.textContent) {
          screenStyleData = styleDataEl.textContent;
        }

        if (!screensData) {
          return;
        }

        const data = {
          id: OBJECT_KEY_VALUE,
          screensData,
          cookies,
          screenStyleData,
          version
        };

        if (db) {
          const transaction = startTransaction({ name: 'saveTourDataToIndexedDB' });
          await putDataInDb(db, OBJECT_STORE, data);
          sentryTxReport(transaction, 'screenscount', JSON.parse(screensData).length, 'byte');
          const dbData = await getDataFromDb(db, OBJECT_STORE, OBJECT_KEY_VALUE) as DBData;
          if (!dbData) {
            captureException('Data not stored in indexedDB');
          }
          db.close();
          setTimeout(() => {
            window.location.replace('/create-interactive-demo');
          }, 500);
        }
      }
    }, 300);
  }

  componentWillUnmount() {
    this.timer && clearInterval(this.timer);
  }

  render() {
    if (this.state.loading) {
      return (
        <Tags.HeartLoaderCon>
          <img src={FableLogo} alt="fable loader" style={{ height: '50px', width: '50px', margin: 'auto' }} />
          <Progress strokeColor="#7567ff" status="active" percent={this.state.progressPercent} />
        </Tags.HeartLoaderCon>
      );
    }

    return (
      <div>
        <h1>Done!</h1>
      </div>

    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PrepTour));
