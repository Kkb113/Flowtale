import React from 'react';
import { connect } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { Plan } from '@fable/common/dist/api-contract';
import { Alert, Button, Space } from 'antd';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import { getSubscriptionOrCheckoutNew } from '../../action/creator';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

const mapDispatchToProps = (dispatch: any) => ({
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew(true)),
});

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
});

interface IOwnProps {
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps {
  loading: boolean;
  error: string | null;
}

class WithPlanCheck extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { loading: true, error: null };
  }

  private mounted = false;

  componentDidMount(): void {
    this.mounted = true;
    this.load();
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  private load = async (): Promise<void> => {
    this.setState({ loading: true, error: null });
    try {
      await this.props.getSubscriptionOrCheckoutNew();
      if (this.mounted) this.setState({ loading: false });
    } catch (error) {
      if (this.mounted) {
        this.setState({ loading: false,
          error: error instanceof Error ? error.message : 'The service could not be reached.' });
      }
    }
  };

  render(): JSX.Element {
    if (this.state.error) {
      return (
        <Space direction="vertical" style={{ padding: 32 }}>
          <Alert type="error" showIcon message="Your workspace plan could not be loaded" description={this.state.error} />
          <Button onClick={this.load}>Retry</Button>
        </Space>
      );
    }
    if (this.state.loading || !this.props.subs) return <FullPageTopLoader showLogo />;

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
