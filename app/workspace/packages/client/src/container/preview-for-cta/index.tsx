import React from 'react';
import { connect } from 'react-redux';
import { UndoOutlined } from '@ant-design/icons';
import Header from '../../component/preview-for-cta/header';
import { loadTourAndData } from '../../action/creator';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { getDimensionsBasedOnDisplaySize, getExportBaseUrl, getMobileOperatingSystem, isEventValid, isLandscapeMode } from '../../utils';
import * as Tags from './styled';
import Button from '../../component/button';
import { HEADER_CTA, IFRAME_BASE_URL } from '../../constants';
import { SiteData } from '../../types';
import { CtaFrom } from '../../analytics/types';
import { P_RespTour } from '../../entity-processor';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  loadPublishedTour: (rid: string,
    onComplete: (ts: number) => void,
    exportedTourParam: boolean,
    baseUrl: string
    ) => void,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadPublishedTour: (
    rid: string,
    onComplete: (ts: number) => void,
    exportedTourParam: boolean,
    baseUrl: string
  ) => dispatch(loadTourAndData(rid, false, true, true, null, true, false, null, exportedTourParam, baseUrl)).then(([ts]: [number]) => onComplete(ts)),
});

interface IAppStateProps {
  site: SiteData | null;
  tour: P_RespTour | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  site: state.default.currentTour ? state.default.currentTour.site : null,
  tour: state.default.currentTour || null,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{ tourId: string }>;

interface IOwnStateProps {
  showReplayOverlay: boolean;
  previewIframeKey: number;
  ts: null | number;
  iframeUrl: string;
  isIOSPhone: boolean;
  isLandscapeMode: boolean;
}

class PreviewForCTA extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      previewIframeKey: 0,
      ts: null,
      iframeUrl: '',
      isIOSPhone: getMobileOperatingSystem() === 'iOS',
      isLandscapeMode: isLandscapeMode(window.screen.orientation.type),
    };
  }

  receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation' }>): void => {
    if (isEventValid(e) && e.data.type === 'lastAnnotation') this.setState({ showReplayOverlay: true });
  };

  componentDidMount(): void {
    document.title = this.props.title;
    const baseUrl = getExportBaseUrl(window.location.origin);
    this.props.loadPublishedTour(
      this.props.match.params.tourId,
      (ts: number) => {
        this.setState({ ts });
      },
      this.props.searchParams.get('exportedTour') === '1',
      baseUrl
    );

    window.addEventListener('message', this.receiveMessage, false);

    window.screen.orientation.addEventListener('change', this.screenOrientationChangeListener);
  }

  screenOrientationChangeListener = (e: ScreenOrientationEventMap['change']): void => {
    const evTarget = e.target as ScreenOrientation;
    this.setState({ isLandscapeMode: isLandscapeMode(evTarget.type) });
  };

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
    }

    if (this.state.ts !== prevState.ts && this.state.ts) {
      const loc = window.location.toString();
      const allParams = loc.split('?')[1];
      const baseIframeUrl = `/${IFRAME_BASE_URL}/demo/${this.props.match.params.tourId}`;
      this.setState((prevS) => ({
        iframeUrl: allParams && allParams.length !== 0 ? `${baseIframeUrl}?_ts=${prevS.ts}&${allParams}&fframe=noframe&shadow=1`
          : `${baseIframeUrl}?_ts=${prevS.ts}&fframe=noframe&shadow=1`
      }));
    }

    if (this.props.site && this.props.site !== prevProps.site) {
      document.title = this.props.site.title;
      const link = document.querySelector("link[rel~='icon']");
      if (link && link.id === 'fable-interactive-demo' && this.props.site.logo._val !== '../../favicon.png') {
        (link as HTMLAnchorElement).href = this.props.site.logo._val;
      }
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);
    window.screen.orientation.removeEventListener('change', this.screenOrientationChangeListener);
  }

  handleReplayClick = (): void => {
    this.setState({ showReplayOverlay: false, previewIframeKey: Math.random() });
  };

  captureConversion = (): void => {
    if (this.props.site) {
      const frame = document.getElementById('preview-frame') as HTMLIFrameElement;
      frame.contentWindow?.postMessage({
        ctaFrom: CtaFrom.SiteHeader,
        btnId: '$header_cta',
        url: this.props.site.ctaLink._val,
        btnTxt: this.props.site.ctaText._val,
        tourId: this.props.tour!.id,
        annId: '$header',
        type: HEADER_CTA
      }, '*');
    }
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);

    return (
      <>
        {this.props.site && (
        <Tags.Con siteData={this.props.site}>
          {
            !(this.state.isIOSPhone && this.state.isLandscapeMode) && (
            <Tags.HeaderCon>
              <Header
                site={this.props.site}
                captureConversion={this.captureConversion}
                showFullScreenOption={!this.state.isIOSPhone && this.state.isLandscapeMode}
                makeEmbedFrameFullScreen={() => this.previewFrameRef.current!.requestFullscreen()}
              />
            </Tags.HeaderCon>
            )
          }
          <Tags.PreviewFrameWrapper
            showOverlay={this.state.showReplayOverlay}
          >
            {this.state.showReplayOverlay && (
            <div className="replay-overlay" style={{ height, width }}>
              <Button
                intent="secondary"
                icon={<UndoOutlined />}
                iconPlacement="left"
                style={{ background: '#fff' }}
                onClick={this.handleReplayClick}
              >
                Replay
              </Button>
            </div>
            )}
            <iframe
              key={this.state.previewIframeKey}
              ref={this.previewFrameRef}
              id="preview-frame"
              height={height}
              width={width}
              className="preview-frame"
              src={`${this.state.iframeUrl}`}
              title={this.props.title}
            />
          </Tags.PreviewFrameWrapper>
        </Tags.Con>
        )}
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PreviewForCTA));
