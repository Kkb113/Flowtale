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
    const { pathname, search, hash } = window.location;
    const target = pathname.replace(/^\/p\/(?:demo|tour)\//, '/embed/demo/');
    window.location.replace(target + search + hash);
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
