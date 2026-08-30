import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{
    id: string;
  }>;

interface IOwnStateProps {
}

class Invite extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    localStorage.setItem('fable/invite-id', this.props.match.params.id);

    setTimeout(() => {
      this.props.navigate('/login');
    }, 0);
  }

  render(): React.ReactNode {
    return (
      <FullPageTopLoader />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Invite));
