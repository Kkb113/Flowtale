import React from 'react';
import { connect } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { Plan } from '@fable/common/dist/api-contract';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import { getSubscriptionOrCheckoutNew } from '../../action/creator';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

const mapDispatchToProps = (dispatch: any) => ({
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
});

interface IOwnProps {
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps { }

class WithPlanCheck extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount() {
    this.props.getSubscriptionOrCheckoutNew();
  }

  render() {
    if (!this.props.subs) return <FullPageTopLoader showLogo />;

    let shouldShowSoloConfirmation = false;
    if (this.props.subs) {
      shouldShowSoloConfirmation = Boolean(this.props.subs.paymentPlan === Plan.SOLO && !this.props.subs.info?.soloPlanDowngradeIntentReceived);
    }

    return shouldShowSoloConfirmation ? <Navigate to="/billing" /> : <Outlet />;
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(WithPlanCheck));
