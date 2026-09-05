import React from 'react';
import { connect } from 'react-redux';
import { ITourLoaderData } from '@fable/common/dist/types';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import LoaderEditor from '../../component/loader-editor';
import LoaderPersistenceContext from '../tour-editor/loader-persistence-context';
import { FeatureForPlan } from '../../plans';

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
      <LoaderPersistenceContext.Consumer>{save => <LoaderEditor
        subs={this.props.subs}
        data={this.props.tourLoaderData!}
        tour={this.props.tour!}
        closeEditor={this.props.closeEditor}
        recordLoaderData={(_tour, data) => {
          if (!save) throw new Error('The editor is not ready to save.');
          save(data);
        }}
        isAutoSaving={this.props.isAutoSavingLoader}
        featureForPlan={this.props.featureForPlan}
      />}
      </LoaderPersistenceContext.Consumer>
    );
  }
}

export default connect<IAppStateProps, {}, IOwnProps, TState>(
  mapStateToProps,
  null
)(withRouter(ScreenPicker));
