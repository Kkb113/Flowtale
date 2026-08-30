import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { ScreenType } from '@fable/common/dist/api-contract';
import { ArrowUpOutlined, FileImageOutlined, FileTextOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
import { getDisplayableTime } from '@fable/common/dist/utils';
import { LoadingStatus } from '@fable/common/dist/types';
import { NavigateFunction } from 'react-router-dom';
import { Popover, Button } from 'antd';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import {
  addScreenToTour,
  AnnAdd,
  getAllScreens,
  uploadImgScreenAndAddToTour,
  loadTourAndData
} from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import {
  AnnotationPerScreen,
  DestinationAnnotationPosition,
  IAnnotationConfigWithScreen,
  ScreenPickerMode
} from '../../types';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import { getAnnotationsPerScreen } from '../../utils';
import UploadImageScreen from './upload-image-screen';
import CloseIcon from '../../assets/tour/close.svg';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import NextIcon from '../../assets/tour/next.svg';
import Loader from '../../component/loader';
import { amplitudeAddScreensToTour, amplitudeNewAnnotationCreated, propertyCreatedFromWithType } from '../../amplitude';

interface IDispatchProps {
  getAllScreens: (forceRefresh?: boolean) => void;
  addScreenToTour: (
    screen: P_RespScreen,
    tourRid: string,
    annAdd?: AnnAdd,
    navigateTo?: NavigateFunction,
    closeScreenPicker?: ()=>void,
  ) => void,
  uploadImgScreenAndAddToTour: (
    screenName: string,
    screenImgFile: File,
    tourRid: string,
    navigateTo?: NavigateFunction
  ) => void
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllScreens: (forceRefresh: boolean = false) => dispatch(getAllScreens(forceRefresh)),
  addScreenToTour: (
    screen,
    tourRid,
    annAddData,
    navigateTo,
    closeScreenPicker
  ) => {
    dispatch(addScreenToTour(screen, tourRid, annAddData))
      .then((screenRid: string) => {
        if (navigateTo) {
          closeScreenPicker!();
          navigateTo(`/demo/${tourRid}/${screenRid}`);
        }
      });
  },
  uploadImgScreenAndAddToTour: (
    screenName,
    screenImgFile,
    tourRid,
  ) => {
    dispatch(uploadImgScreenAndAddToTour(screenName, screenImgFile, tourRid))
      .then((screenRid: string) => {
        dispatch(loadTourAndData(tourRid, true, false));
      });
  }

});

interface IAppStateProps {
  rootScreens: P_RespScreen[];
  tour: P_RespTour | null;
  allAnnotationsForTour: AnnotationPerScreen[];
  screenLoadingFinished: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  rootScreens: state.default.rootScreens,
  tour: state.default.currentTour,
  allAnnotationsForTour: getAnnotationsPerScreen(state),
  screenLoadingFinished: state.default.allScreensLoadingStatus === LoadingStatus.Done
});

interface IOwnProps {
  hideScreenPicker: () => void;
  screenPickerMode: ScreenPickerMode;
  addAnnotationData: IAnnotationConfigWithScreen | null;
  showCloseButton: boolean;
  addCoverAnnToScreen: (screenId: number) => void;
  position: DestinationAnnotationPosition,
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
  screensNotPartOfTour: P_RespScreen[],
  screensPartOfTour: P_RespScreen[],
  showUploadScreenImgModal: boolean,
  currentPage: number,
}

const ITEMS_PER_PAGE = 15;

interface ScreenComponentProps {
  screen: P_RespScreen;
  handleAddScreen: (screen: P_RespScreen) => void;
  duplicateScreenToTour?: (screen: P_RespScreen) => void;
}

function ScreenCard({ screen, handleAddScreen, duplicateScreenToTour }: ScreenComponentProps): ReactElement {
  return (
    <Tags.Screen
      id="screen-card"
      key={screen.id}
      onClick={() => {
        handleAddScreen(screen);
      }}
    >
      <Tags.ScreenThumbnail src={screen.thumbnailUri.href} alt={screen.displayName} />
      <Tags.ScreenContent>
        <Tags.ScreenTitleIconCon>
          <div className="card-title">{screen.displayName}</div>
          <div>
            {
              screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
            }
          </div>
        </Tags.ScreenTitleIconCon>
        {
          screen.type === ScreenType.SerDom && (
            <Tags.ScreenLink onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(screen.url, '_blank');
            }}
            >
              <ArrowUpOutlined style={{ color: '#7567ff', transform: 'rotate(45deg)' }} />
              <div className="typ-sm shorten">{screen.url}</div>
            </Tags.ScreenLink>)
        }
        <Tags.ScreenTitleIconCon>
          <div className="typ-sm">
            Created {getDisplayableTime(screen.createdAt)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <GTags.Avatar src={screen.createdBy.avatar} alt="profile" />
            {duplicateScreenToTour && (
              <Popover
                content={
                  <Tags.ScreenOptionPopoverCon
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <GTags.PopoverMenuItem
                      onMouseDown={(e) => handleAddScreen(screen)}
                    >
                      <div className="title">Add existing screen</div>
                      <div className="typ-sm">
                        This screen is already added in the demo, click here to add it again.
                        All the edits would be kept intact.
                      </div>
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={(e) => duplicateScreenToTour(screen)}
                    >
                      <div className="title">Copy and add screen</div>
                      <div className="typ-sm">
                        Copy a new version of the same screen and add to the demo.
                        Edits on screen will be discarded
                      </div>
                    </GTags.PopoverMenuItem>
                  </Tags.ScreenOptionPopoverCon>
                }
                trigger="click"
                placement="right"
              >
                <Button
                  style={{ padding: 0, margin: 0 }}
                  size="small"
                  shape="circle"
                  type="text"
                  icon={<MoreOutlined />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </Popover>
            )}
          </div>
        </Tags.ScreenTitleIconCon>
      </Tags.ScreenContent>
    </Tags.Screen>
  );
}

class ScreenPicker extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      screensNotPartOfTour: [],
      screensPartOfTour: [],
      showUploadScreenImgModal: false,
      currentPage: 1,
    };
  }

  componentDidMount(): void {
    this.props.getAllScreens();
    this.formAndSetScreensNotPartOfTour();
    this.setScreensPartOfTour();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.screenLoadingFinished && prevProps.screenLoadingFinished !== this.props.screenLoadingFinished) {
      this.formAndSetScreensNotPartOfTour();
    }

    if (this.props.tour && prevProps.tour !== this.props.tour) {
      this.setScreensPartOfTour();
    }
  }

  formAndSetScreensNotPartOfTour = (): void => {
    const rootScreensMap = this.props.rootScreens.reduce((store, srn) => {
      store[srn.id] = srn;
      return store;
    }, {} as Record<string, P_RespScreen>);
    for (const screenAnnPair of this.props.allAnnotationsForTour) {
      delete rootScreensMap[screenAnnPair.screen.parentScreenId];
    }
    const srnNotPartOfTour = Object.values(rootScreensMap).sort((m, n) => +n.updatedAt - +m.updatedAt);
    this.setState({ screensNotPartOfTour: srnNotPartOfTour });
  };

  setScreensPartOfTour = (): void => {
    if (this.props.tour) {
      this.setState({
        screensPartOfTour: this.props.tour.screens?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          || []
      });
    }
  };

  handleAddScreenPartOfTour = (screen: P_RespScreen): void => {
    const screenId = screen.id;
    const screenRid = screen.rid;
    amplitudeAddScreensToTour(1, 'app');

    if (this.props.screenPickerMode === 'create') {
      if (this.props.match.params.screenId) {
        amplitudeNewAnnotationCreated(propertyCreatedFromWithType.TIMELINE_PLUS_ICON_COVER_NEW_SCREEN);
      } else {
        amplitudeNewAnnotationCreated(propertyCreatedFromWithType.CANVAS_PLUS_ICON_COVER_NEW_SCREEN);
      }
      this.props.addCoverAnnToScreen(screenId);
      this.props.hideScreenPicker();
    } else {
      this.props.hideScreenPicker();
      const url = `/demo/${this.props.tour!.rid}/${screenRid}`;
      this.props.navigate(url);
    }
  };

  // eslint-disable-next-line class-methods-use-this
  handleAddScreenNotPartOfTour = (screen: P_RespScreen): void => {
    amplitudeAddScreensToTour(1, 'app');
    if (this.props.screenPickerMode === 'create') {
      if (this.props.match.params.screenId) {
        amplitudeNewAnnotationCreated(propertyCreatedFromWithType.TIMELINE_PLUS_ICON_COVER_NEW_SCREEN);
      } else {
        amplitudeNewAnnotationCreated(propertyCreatedFromWithType.CANVAS_PLUS_ICON_COVER_NEW_SCREEN);
      }
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        {
          position: this.props.position,
          screenId: this.props.addAnnotationData!.screen.id,
          grpId: this.props.addAnnotationData!.grpId,
          refId: this.props.addAnnotationData!.refId
        }
      );

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        this.props.hideScreenPicker();
      }, 1000);
    } else {
      this.props.addScreenToTour(
        screen,
        this.props.tour!.rid,
        undefined,
        this.props.navigate,
        this.props.hideScreenPicker
      );
    }
  };

  duplicateScreenToTour = (screen: P_RespScreen): void => {
    let parentScreen: P_RespScreen = screen;
    if (screen.type === ScreenType.SerDom) {
      parentScreen = this.props.rootScreens.find(srn => srn.id === screen.parentScreenId)!;
    }
    this.handleAddScreenNotPartOfTour(parentScreen);
  };

  handleLoadMoreScreens = (): void => {
    this.setState((prevState) => ({
      currentPage: prevState.currentPage + 1,
    }));
  };

  shouldShowPaginationOption = (paginatedScreens: P_RespScreen[]): boolean => {
    const result = paginatedScreens.length < this.state.screensNotPartOfTour.length;
    return result;
  };

  render(): JSX.Element {
    const endIndex = this.state.currentPage * ITEMS_PER_PAGE;
    const paginatedScreensNotPartOfTour = this.state.screensNotPartOfTour.slice(0, endIndex);

    return (
      <>
        <Tags.ScreenPickerCon>
          {/* <Tags.PolkaDotGridBg /> */}
          {this.props.showCloseButton
          && <Tags.CloseIcon alt="" src={CloseIcon} onClick={this.props.hideScreenPicker} />}
          <Tags.FableLogo alt="" src={FableLogo} />
          {!this.props.screenLoadingFinished && <Loader width="100px" txtBefore="Loading all screens" />}
          {this.props.screenLoadingFinished && (
            <>
              <Tags.MsgCon>
                <Tags.Heading className="typ-h1">Choose screens to add in this demo</Tags.Heading>
                <Tags.SubHeading className="typ-reg">
                  You can upload images/gifs from your system and add those in this demos.
                  You can also use our chrome extension to record your product and add it as part of this demo.
                </Tags.SubHeading>
              </Tags.MsgCon>
              <Tags.ScreenCardCon id="screen-picker-grid">
                <Tags.Screen
                  bordered
                  onClick={() => {
                    this.setState({ showUploadScreenImgModal: true });
                  }}
                  id="IUG-2"
                >
                  <Tags.UploadImgCont>
                    <UploadOutlined style={{ fontSize: '3rem' }} />
                    <div className="typ-ip">Upload image</div>
                  </Tags.UploadImgCont>
                </Tags.Screen>
                <Tags.Screen dontSelect>
                  <Tags.UploadImgCont>
                    <div className="typ-reg">
                      Use Fable's Chrome extension to record your product screens and add those screens to this to this demo
                    </div>
                  </Tags.UploadImgCont>
                </Tags.Screen>
                {this.state.screensPartOfTour.map(screen => (
                  <ScreenCard
                    screen={screen}
                    handleAddScreen={this.handleAddScreenPartOfTour}
                    key={screen.id}
                    duplicateScreenToTour={this.duplicateScreenToTour}
                  />
                ))}
                {paginatedScreensNotPartOfTour.map(screen => (
                  <ScreenCard screen={screen} handleAddScreen={this.handleAddScreenNotPartOfTour} key={screen.id} />
                ))}
                {this.shouldShowPaginationOption(paginatedScreensNotPartOfTour)
                  && (
                  <Tags.Screen
                    onClick={this.handleLoadMoreScreens}
                    bordered
                  >
                    <Tags.LoadNextCon>
                      <img src={NextIcon} alt="" style={{ marginBottom: '21px' }} />
                      <Tags.Heading>See next</Tags.Heading>
                      <Tags.SubHeading>Load next set of screens</Tags.SubHeading>
                    </Tags.LoadNextCon>
                  </Tags.Screen>
                  )}
              </Tags.ScreenCardCon>
            </>
          )}

        </Tags.ScreenPickerCon>
        {
          this.state.showUploadScreenImgModal && (
            <UploadImageScreen
              open={this.state.showUploadScreenImgModal}
              closeModal={() => this.setState({ showUploadScreenImgModal: false })}
              tourRid={this.props.tour!.rid}
              uploadImgScreenAndAddToTour={(screenName: string, screenImgFile: File) => {
                this.props.uploadImgScreenAndAddToTour(
                  screenName,
                  screenImgFile,
                  this.props.tour!.rid,
                );
              }}
            />
          )
        }
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ScreenPicker));
