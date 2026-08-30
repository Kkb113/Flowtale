import React from 'react';
import { connect } from 'react-redux';
import { IGlobalConfig, LoadingStatus } from '@fable/common/dist/types';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { getGlobalConfig, updateGlobalConfig, publishTour, getAllTours } from '../../action/creator';
import Editor from '../../component/global-config-editor/editor';
import Loader from '../../component/loader';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import { FeatureForPlan } from '../../plans';

interface IDispatchProps {
  getGlobalConfig: () => void;
  updateGlobalConfig: (updatedGlobalConfig: IGlobalConfig) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  getAllTours: () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getGlobalConfig: () => dispatch(getGlobalConfig()),
  updateGlobalConfig: (updatedGlobalConfig) => dispatch(updateGlobalConfig(updatedGlobalConfig)),
  publishTour: (tour) => dispatch(publishTour(tour)),
  getAllTours: () => dispatch(getAllTours(false)),
});

interface IAppStateProps {
  globalConfig: IGlobalConfig | null;
  tours: P_RespTour[];
  allToursLoadingStatus: LoadingStatus;
  featurePlan: FeatureForPlan | null;
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  globalConfig: state.default.globalConfig,
  tours: state.default.tours,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  featurePlan: state.default.featureForPlan,
  subs: state.default.subs,
});

interface IOwnProps { }

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

type IOwnStateProps = {
  totalPublishedDemos: number | null;
  totalRepublishedDemos: number;
  republishingStatus: LoadingStatus;
}

class GlobalConfigEditor extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      totalPublishedDemos: null,
      totalRepublishedDemos: 0,
      republishingStatus: LoadingStatus.NotStarted,
    };
  }

  componentDidMount(): void {
    this.props.getGlobalConfig();
    this.props.getAllTours();
    if (this.props.allToursLoadingStatus === LoadingStatus.Done) {
      this.setTotalPublishedDemos();
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.allToursLoadingStatus === LoadingStatus.Done && this.props.tours !== prevProps.tours) {
      this.setTotalPublishedDemos();
    }
  }

  setTotalPublishedDemos = (): void => {
    const totalPublishedDemos = this.props.tours.filter(t => t.lastPublishedDate).length;
    this.setState({ totalPublishedDemos });
  };

  republishAllPublishedDemos = async (): Promise<void> => {
    this.setState({ totalRepublishedDemos: 0, republishingStatus: LoadingStatus.InProgress });

    const publishedTours = this.props.tours.filter(t => t.lastPublishedDate);
    const BATCH_SIZE = 9;
    let totalRepublishedTour = 0;

    for (let i = 0; i < publishedTours.length; i += BATCH_SIZE) {
      const batch = publishedTours.slice(i, i + BATCH_SIZE);

      const promises = batch.map(t => this.props.publishTour(t));

      await Promise.all(promises);

      totalRepublishedTour += batch.length;

      this.setState({ totalRepublishedDemos: totalRepublishedTour });
    }

    this.setState({ republishingStatus: LoadingStatus.Done });
  };

  render(): JSX.Element {
    if (
      !this.props.globalConfig
      || this.props.allToursLoadingStatus !== LoadingStatus.Done
      || this.state.totalPublishedDemos === null
    ) {
      return (
        <div style={{ height: '50vh' }}>
          <Loader width="100px" />
        </div>
      );
    }

    return (
      <Editor
        republishAllPublishedDemos={this.republishAllPublishedDemos}
        globalConfig={this.props.globalConfig}
        updateGlobalConfig={this.props.updateGlobalConfig}
        totalPublishedDemos={this.state.totalPublishedDemos}
        totalRepublishedDemos={this.state.totalRepublishedDemos}
        republishingStatus={this.state.republishingStatus}
        featurePlan={this.props.featurePlan}
        subs={this.props.subs}
      />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(GlobalConfigEditor));
