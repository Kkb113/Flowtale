import React from 'react';
import { connect } from 'react-redux';
import { ITourLoaderData } from '@fable/common/dist/types';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import LoaderEditor from '../../component/loader-editor';
import { recordLoaderData, startAutosavingLoader } from '../../action/creator';
import { FeatureForPlan } from '../../plans';

interface IDispatchProps {
    recordLoaderData: (tour: P_RespTour, loader: ITourLoaderData) => void;
    startAutosavingLoader: () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  recordLoaderData: (tour, loader) => dispatch(recordLoaderData(tour, loader)),
  startAutosavingLoader: () => dispatch(startAutosavingLoader()),
});

interface IAppStateProps {
  tourLoaderData: ITourLoaderData | null,
  tour: P_RespTour | null,
  isAutoSavingLoader: boolean,
  featureForPlan: FeatureForPlan | null,
  subs: P_RespSubscription | null,
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tourLoaderData: state.default.tourLoaderData,
  tour: state.default.currentTour,
  isAutoSavingLoader: state.default.isAutoSavingLoader,
  featureForPlan: state.default.featureForPlan,
  subs: state.default.subs
});

interface IOwnProps {
    closeEditor: () => void;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

type IOwnStateProps = {
}

class ScreenPicker extends React.PureComponent<IProps, IOwnStateProps> {
  render():JSX.Element {
    return (
      <LoaderEditor
        subs={this.props.subs}
        data={this.props.tourLoaderData!}
        tour={this.props.tour!}
        closeEditor={this.props.closeEditor}
        recordLoaderData={this.props.recordLoaderData}
        isAutoSaving={this.props.isAutoSavingLoader}
        startAutosavingLoader={this.props.startAutosavingLoader}
        featureForPlan={this.props.featureForPlan}
      />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ScreenPicker));
