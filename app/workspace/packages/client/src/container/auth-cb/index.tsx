import React from 'react';
import { connect } from 'react-redux';
import { openDb, DB_NAME, OBJECT_KEY, OBJECT_STORE } from '@fable/common/dist/db-utils';
import { readCapture } from '@fable/common/dist/capture-storage';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {
}

export class AuthCallback extends React.PureComponent<IProps, IOwnStateProps> {
  private db: IDBDatabase | null;

  private active = false;

  constructor(props: IProps) {
    super(props);
    this.db = null;
  }

  componentDidMount(): void {
    this.active = true;
    this.redirect();
  }

  componentWillUnmount(): void {
    this.active = false;
  }

  private async redirect(): Promise<void> {
    try {
      this.db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
      if (!this.active) return;
      const capture = new URLSearchParams(window.location.search).get('capture');
      const dbData = await readCapture(this.db, capture);
      if (!this.active) return;
      const id = dbData?.captureSessionId;
      this.props.navigate(dbData ? `/create-interactive-demo${id ? `?capture=${encodeURIComponent(id)}` : ''}` : '/demos');
    } catch {
      if (this.active) this.props.navigate('/demos');
    } finally {
      this.db?.close();
      this.db = null;
    }
  }

  render(): React.ReactNode {
    return (
      <div><TopLoader duration={TOP_LOADER_DURATION} showLogo /></div>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AuthCallback));
