import { DatabaseOutlined, LoadingOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import {
  getAllDatasets,
  createNewDataset,
  publishDataset,
  deleteDataset,
  getDataset,
  editDataset,
  updateDatasetDesc,
  getSubscriptionOrCheckoutNew,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';
import Button from '../../component/button';
import Input from '../../component/input';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import DatasetCard from './card';
import { showDeleteConfirm } from '../../component/demo-hub-editor/delete-confirm';
import TextArea from '../../component/text-area';
import { DatasetConfig } from '../../types';
import { debounce, isFeatureAvailable } from '../../utils';
import EditableTable from '../../component/editable-table';
import { P_Dataset } from '../../entity-processor';
import DatasetInfoEditor from './dataset-info-editor';
import Upgrade from '../../component/upgrade';

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllDatasets: () => dispatch(getAllDatasets()),
  createNewDataset: (name: string, description: string) => dispatch(createNewDataset(name, description)),
  updateDatasetDesc: (name: string, description: string) => dispatch(updateDatasetDesc(name, description)),
  publishDataset: (name: string) => dispatch(publishDataset(name)),
  deleteDataset: (name: string) => dispatch(deleteDataset(name)),
  loadDataset: (name: string) => dispatch(getDataset(name)),
  editDataset: (name: string, config: DatasetConfig) => dispatch(editDataset(name, config)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  datasets: state.default.datasets,
  datasetConfigs: state.default.datasetConfigs,
  featurePlan: state.default.featureForPlan,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps
  & ReturnType<typeof mapStateToProps>
  & ReturnType<typeof mapDispatchToProps>
  & WithRouterProps<{ datasetName?: string; }>;

interface IOwnStateProps {
  showCreateModal: boolean;
  createErrorStatus: null | 'already_used_name' | 'invalid_name';
  isDatasetFeatureAvailable: boolean;
}
const { confirm } = Modal;

class Datasets extends React.PureComponent<IProps, IOwnStateProps> {
  datasetNameIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  datasetDescIpRef: React.RefObject<HTMLTextAreaElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showCreateModal: false,
      createErrorStatus: null,
      isDatasetFeatureAvailable: true,
    };
  }

  componentDidMount(): void {
    this.props.getAllDatasets();
    document.title = this.props.title;

    if (this.props.match.params.datasetName) { this.props.loadDataset(this.props.match.params.datasetName); }
    if (this.props.featurePlan) this.checkIfDatasetFeatureAvailable();
  }

  componentDidUpdate(
    prevProps: Readonly<IProps>,
    prevState: Readonly<IOwnStateProps>,
  ): void {
    if (prevProps.org !== this.props.org && this.props.org) {
      this.props.getAllDatasets();
    }
    if (prevProps.match.params.datasetName !== this.props.match.params.datasetName) {
      if (this.props.match.params.datasetName) { this.props.loadDataset(this.props.match.params.datasetName); }
    }
    if (this.props.featurePlan !== prevProps.featurePlan) {
      this.checkIfDatasetFeatureAvailable();
    }
  }

  checkIfDatasetFeatureAvailable(): void {
    const isAvailable = isFeatureAvailable(
      this.props.featurePlan,
      'dataset',
    ).isAvailable;
    this.setState({ isDatasetFeatureAvailable: isAvailable });
  }

  getSelectedDataset = (): [P_Dataset, DatasetConfig] | null => {
    const datasetName = this.props.match.params.datasetName;
    if (!datasetName) return null;
    if (!(this.props.datasets && this.props.datasetConfigs)) return null;
    const dataset = this.props.datasets[datasetName];
    const datasetConfig = this.props.datasetConfigs[datasetName];
    return [dataset, datasetConfig];
  };

  componentWillUnmount(): void {}

  createNewDataset = async (): Promise<void> => {
    const newName = this.datasetNameIpRef.current!.value.trim().replace(/\s+/, ' ');
    const newDescription = this.datasetDescIpRef.current!.value.trim().replace(/\s+/, ' ');
    const res = await this.props.createNewDataset(newName, newDescription);
    if (res.type === 'success') {
      this.closeCreateModal();
      this.navigateToDataset(res.data.name);
      return;
    }
    this.setState({ createErrorStatus: res.data.type });
  };

  closeCreateModal = (): void => {
    this.resetCreateDatasetInfo();
    this.setState({ showCreateModal: false });
  };

  navigateToDataset = (datasetName: string): void => {
    this.props.navigate(`/datasets/${datasetName}`);
  };

  publishDataset = (datasetName: string): void => {
    confirm({
      title: 'Do you want to publish this dataset?',
      icon: <SaveOutlined />,
      onOk: () => {
        this.props.publishDataset(datasetName);
      },
    });
  };

  deleteDataset = (datasetName: string): void => {
    showDeleteConfirm(() => {
      const selectedDataset = this.getSelectedDataset();
      this.props.deleteDataset(datasetName);
      if (selectedDataset) {
        const dataset = selectedDataset[0];
        if (datasetName === dataset.name) {
          this.navigateToDataset('');
        }
      }
    }, `Are you sure you want to delete this dataset ${datasetName}?`);
  };

  resetCreateDatasetInfo = (): void => {
    this.datasetNameIpRef.current!.value = '';
    this.datasetDescIpRef.current!.value = '';
  };

  debouncedOnDatasetConfigChangeHandler = debounce(
    (datasetName: string, updatedDatasetConfig: DatasetConfig) => {
      datasetName && this.props.editDataset(
        datasetName,
        updatedDatasetConfig,
      );
    },
    2000
  );

  onDatasetConfigChange = (datasetName: string, updatedDatsetConfig: DatasetConfig): void => {
    this.debouncedOnDatasetConfigChangeHandler(datasetName, updatedDatsetConfig);
  };

  render(): ReactElement {
    const datasetsLoaded = this.props.datasets !== null;
    const selectedDataset = this.getSelectedDataset();
    return (
      <>
        <GTags.ColCon className="tour-con">
          {(this.props.loadingState === 'loading' || !datasetsLoaded) && (
          <TopLoader
            duration={TOP_LOADER_DURATION}
            showLogo={false}
            showOverlay
          />
          )}
          <SkipLink />
          <div style={{ height: '48px' }}>
            <Header
              tour={null}
              shouldShowFullLogo
              principal={this.props.principal}
              org={this.props.org}
              leftElGroups={[]}
              subs={this.props.subs}
              checkCredit={this.props.getSubscriptionOrCheckoutNew}
            />
          </div>
          <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
            <GTags.SidePanelCon flat={this.props.searchParams.get('c') === '1'}>
              <SidePanel
                selected="datasets"
                subs={this.props.subs}
                compact={this.props.searchParams.get('c') === '1'}
              />
            </GTags.SidePanelCon>
            <GTags.MainCon
              style={{
                height: '100%',
                overflowY: 'auto',
              }}
              className="custom-scrollbar"
            >
              <GTags.BodyCon
                style={{
                  flexDirection: 'column',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'start',
                }}
                id="main"
              >
                {datasetsLoaded && (
                <div style={{ width: '100%', height: '100%' }}>
                  {Object.values(this.props.datasets!).length === 0 || !this.state.isDatasetFeatureAvailable ? (
                    <Tags.EmptyDatasetsCon
                      className="left-gutter"
                      style={{
                        maxWidth: '680px',
                      }}
                    >
                      <p className="typ-h2"><DatabaseOutlined /> No datasets created. Start by creating one!</p>
                      {this.state.isDatasetFeatureAvailable
                        ? (
                          <Button
                            icon={<PlusOutlined />}
                            iconPlacement="left"
                            onClick={() => this.setState({ showCreateModal: true })}
                            intent="primary"
                          >
                            Create a dataset
                          </Button>
                        )
                        : <Upgrade subs={this.props.subs} inline clickedFrom="datasets" />}
                      <p className="typ-reg">
                        You can create a dataset to personalize your demo content.
                        A dataset is a simple table that holds dynamic data that you want to use to personalize your demo.
                      </p>
                      <p className="typ-reg">
                        Once you create a dataset and add data to the dataset,
                        you can select row(s) of a dataset as a source of your demo personalization data.
                      </p>
                      <p className="typ-reg">
                        Let's say, you want to personalize a demo across accounts.
                        You start by defining a dataset that holds personalization content. Following is an example dataset
                      </p>
                      <table className="sample-table">
                        <caption style={{ textAlign: 'left' }}>usecase_per_account</caption>
                        <thead>
                          <tr>
                            <td>account</td>
                            <td>display_name</td>
                            <td>goal</td>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>acme</td>
                            <td>Acme Inc.</td>
                            <td>An interactive demo help increase number of rockets Acme sends to Venus</td>
                          </tr>
                          <tr>
                            <td>kimchi</td>
                            <td>Kimchi Kong.</td>
                            <td>An interactive demo help increase mortality rate among owls</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="typ-reg">
                        Once the dataset is defined, you can personalize a demo by using data from above table via query parameter
                        <code style={{ fontSize: '0.9rem' }}>/embed/demo/my-demo-id?dataset=usecase_per_account(account.is.acme)</code>
                      </p>
                      <p className="typ-reg">
                        Dataset helps you to create a demo once and use it as template
                        by sourcing the personalized data from dataset itself.
                      </p>
                    </Tags.EmptyDatasetsCon>
                  ) : (
                    <Tags.DatasetViewCon>
                      <div className="ds-editor">
                        {selectedDataset ? (
                          selectedDataset[1] ? (
                            <div>
                              <DatasetInfoEditor
                                dataset={selectedDataset[0]}
                                onPublish={this.publishDataset}
                                updateDatasetDesc={this.props.updateDatasetDesc}
                              />
                              <EditableTable
                                dataset={selectedDataset[1]}
                                data={selectedDataset[0]}
                                onDatasetConfigChange={this.onDatasetConfigChange}
                              />
                            </div>
                          ) : (
                            <LoadingOutlined />
                          )
                        ) : (
                          <div className="typ-sm no-ds-sel-con">
                            Select a dataset from the panel below.
                          </div>
                        )}
                      </div>
                      <div className="ds-cards">
                        <Tags.InlineCardBtn
                          onClick={() => this.setState({ showCreateModal: true })}
                        >
                          <PlusOutlined />
                          <span>
                            New dataset
                          </span>
                        </Tags.InlineCardBtn>
                        <div className="cards-con">
                          {Object.values(this.props.datasets!).map((dataset, index) => (
                            <DatasetCard
                              key={dataset.name}
                              dataset={dataset}
                              navigateToDataset={this.navigateToDataset}
                              publish={this.publishDataset}
                              delete={this.deleteDataset}
                              isSelected={this.props.match.params.datasetName === dataset.name}
                            />
                          ))}
                        </div>
                      </div>
                    </Tags.DatasetViewCon>
                  )}
                </div>
                )}
              </GTags.BodyCon>
            </GTags.MainCon>
          </GTags.RowCon>
        </GTags.ColCon>
        <GTags.BorderedModal
          donotShowHeaderStip
          containerBg="#f5f5f5"
          style={{ height: '10px' }}
          open={this.state.showCreateModal}
          onOk={this.createNewDataset}
          onCancel={this.closeCreateModal}
          footer={(
            <div className="button-two-col-cont">
              <Button
                type="button"
                intent="secondary"
                onClick={this.closeCreateModal}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1 }}
                onClick={this.createNewDataset}
              >
                Save
              </Button>
            </div>
            )}
        >
          <div className="modal-content-cont">
            <div className="typ-h2">Create dataset</div>
            <div className="typ-sm">Dataset name can't be changed once it's created.</div>
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.createNewDataset();
                }}
                style={{
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  gap: '1rem',
                  flexDirection: 'column',
                  display: 'flex'
                }}
              >
                <Input
                  label="Dataset name"
                  innerRef={this.datasetNameIpRef}
                  onChange={() => this.setState({ createErrorStatus: null })}
                />
                <TextArea
                  label="Enter description for this dataset"
                  innerRef={this.datasetDescIpRef}
                />
                {this.state.createErrorStatus && (
                  <Tags.ErrorMsg className="error-msg">
                    {this.state.createErrorStatus === 'already_used_name' && 'Duplicate name. Please use another name'}
                    {this.state.createErrorStatus === 'invalid_name' && 'Invalid name. Only use [a-ZA-Z0-9_]'}
                  </Tags.ErrorMsg>
                )}
              </form>
            </div>
          </div>
        </GTags.BorderedModal>
      </>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Datasets));
