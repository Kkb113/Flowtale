import React from 'react';
import { connect } from 'react-redux';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import SeeAll from '../../component/demo-hub-see-all';
import { loadDemoHubAndData } from '../../action/creator';
import { DemoHubPreviewEnumMsgType, DemoHubPreviewMsgData, IDemoHubConfig } from '../../types';

interface IDispatchProps {
  loadDemoHubAndData: (rid: string, loadPublished: boolean) => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadDemoHubAndData: (rid, loadPublished: boolean) => dispatch(loadDemoHubAndData(rid, true, loadPublished)),

});

interface IAppStateProps {
  config: IDemoHubConfig | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  config: state.default.currentDemoHubConfig,
});

interface IOwnProps {
  title: string;
  staging: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    demoHubRid: string;
  }>;

type IOwnStateProps = {
  config: IDemoHubConfig | null;
  demoParams: Record<string, any>;
}

class DemoHubSeeAll extends React.PureComponent<IProps, IOwnStateProps> {
  private isLivePreviewInEditor = (new URLSearchParams(window.location.search)).get('lp');

  constructor(props: IProps) {
    super(props);
    this.state = {
      config: null,
      demoParams: {},
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;

    if (this.props.config && !this.isLivePreviewInEditor) {
      this.setState({ config: this.props.config });
    }

    if (this.isLivePreviewInEditor) {
      window.addEventListener('message', this.messageEventListener);
      window.parent.postMessage({ type: DemoHubPreviewEnumMsgType.PREVIEW_INIT }, '*');
    } else {
      this.props.loadDemoHubAndData(this.props.match.params.demoHubRid, !this.props.staging);
    }

    if (this.isLivePreviewInEditor || this.props.staging) {
      this.setState({ demoParams: { staging: true } });
    }
  }

  messageEventListener = (e: MessageEvent): void => {
    const msgData: DemoHubPreviewMsgData = e.data;

    switch (msgData.type) {
      case DemoHubPreviewEnumMsgType.UPDATE_CONFIG: {
        this.setState({ config: msgData.config });
        break;
      }
      default: {
        break;
      }
    }
  };

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (!this.isLivePreviewInEditor) {
      if (prevProps.config !== this.props.config && this.props.config) {
        this.setState({ config: this.props.config });
      }
    }
  }

  render(): JSX.Element {
    // TODO add loader here
    if (!this.state.config) return <></>;

    return (
      <SeeAll
        config={this.state.config}
        demoParams={this.state.demoParams}
        demoHubRid={this.props.match.params.demoHubRid}
      />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DemoHubSeeAll));
