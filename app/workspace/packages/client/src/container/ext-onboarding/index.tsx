import React from 'react';
import { connect } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import RootLayout from '../../component/ext-onboarding/root-layout';

export const ONBOARDING_PAGE_ROUTES = ['/onboarding/extension-installed'];

interface IDispatchProps {}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({});

interface IAppStateProps {}

const mapStateToProps = (state: TState): IAppStateProps => ({});

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
  }>;

interface IOwnStateProps {}

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { };
  }

  componentDidMount(): void {
    if (window.location.pathname === '/onboarding' || window.location.pathname === '/onboarding/') {
      window.location.replace('onboarding/extension-installed');
    }
  }

  render(): JSX.Element {
    return (
      <RootLayout>
        <Outlet />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Screens));
