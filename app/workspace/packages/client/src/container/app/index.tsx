import React from 'react';
import { connect } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import { init, iam } from '../../action/creator';
import { InternalEvents, STORAGE_PREFIX_KEY_QUERY_PARAMS } from '../../types';
import { disposeInternalEvents, initInternalEvents } from '../../internal-events';
import { P_RespTour } from '../../entity-processor';
import { addToGlobalAppData, initGlobalClock } from '../../global';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { IFRAME_BASE_URL, LIVE_BASE_URL } from '../../constants';

export const REACT_APP_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT as string;

interface IDispatchProps {
  init: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  init: () => dispatch(init()),
  iam: () => dispatch(iam())
});

interface IAppStateProps {
  isInitied: boolean;
  isTourLoaded: boolean;
  tour: P_RespTour | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
  isTourLoaded: state.default.tourLoaded,
  tour: state.default.currentTour,
});

interface IOwnProps {
  router: any
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps { }

class App extends React.PureComponent<IProps, IOwnStateProps> {
  private ls: Array<[InternalEvents, (e: Event) => void]> = [];

  componentDidMount(): void {
    const queryParamsStr = window.location.search.substring(1);

    try {
      const params = new URLSearchParams(queryParamsStr);
      ['wpp', 'wpd'].forEach(name => {
        const value = params.get(name);
        if (!value) return;
        localStorage.setItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/${name}`, value);
      });
    } catch (e) {
      raiseDeferredError(e as Error);
    }

    if (this.shouldInit()) this.props.init();

    initGlobalClock();
    this.ls = initInternalEvents();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.isTourLoaded !== this.props.isTourLoaded) {
      addToGlobalAppData('demo', this.props.tour!);
    }
  }

  componentWillUnmount(): void {
    disposeInternalEvents(this.ls);
  }

  // eslint-disable-next-line class-methods-use-this
  shouldInit(): boolean {
    // don't init for published route as the data is already present in tour file
    const params = new URL(document.location.href).searchParams;
    const isStaging = params.get('staging');
    addToGlobalAppData('settings', { shouldLogEvent: REACT_APP_ENVIRONMENT !== 'dev' && !isStaging });
    if ((document.location.pathname.startsWith(`/${IFRAME_BASE_URL}/demo`)
      || document.location.pathname.startsWith(`/${LIVE_BASE_URL}/demo`)) && !isStaging) return false;
    // don't init for same origin iframe
    return document.location.pathname !== '/aboutblank';
  }

  render(): JSX.Element {
    if (this.shouldInit() && !this.props.isInitied) {
      return <div />;
    }

    return (
      <>
        <RouterProvider router={this.props.router} fallbackElement={<FullPageTopLoader showLogo />} />
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(App);
