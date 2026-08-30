import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{
    tourId: string;
    screenRid?: string;
    annotationId?: string;
  }>;

interface IOwnStateProps {
}

class RedirectFromP extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    const loc = window.location.toString();
    const allParams = loc.split('?')[1];
    const iframeUrl = `/embed/demo/${this.props.match.params.tourId}`;
    const iframeUrlWithParams = allParams ? `${iframeUrl}?${allParams}` : iframeUrl;
    window.location.replace(iframeUrlWithParams);
  }

  render(): React.ReactNode {
    return (
      <></>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(RedirectFromP));
