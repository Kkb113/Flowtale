import React, { useEffect, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp, IAnnotationConfig, Property, PropertyType } from '@fable/common/dist/types';
import { LoadingOutlined } from '@ant-design/icons';
import { Collapse, Drawer, Spin } from 'antd';
import { timeFormat } from 'd3-time-format';
import { GlobalPropsPath, createGlobalProperty, createLiteralProperty } from '@fable/common/dist/utils';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { useDispatch } from 'react-redux';
import { SegmentedValue } from 'antd/es/segmented';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import IframeCodeSnippet from '../header/iframe-code-snippet';
import { createIframeSrc, debounce, getValidUrl, isGlobalProperty, updateQueryParams } from '../../utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_Dataset, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import PublishButton from './publish-button';
import { ParamType } from './utm-params-helper';
import UrlCodeShare from './url-code-share';
import FileInput from '../file-input';
import { uploadImgFileObjectToAws } from '../../upload-media-to-aws';
import { IFRAME_BASE_URL, LIVE_BASE_URL } from '../../constants';
import { EditItem, INTERACTIVE_MODE, SiteData, SiteData_WithProperty, SiteDateKeysWithProperty, SiteThemePresets } from '../../types';
import { amplitudeCtaConfigChanged } from '../../amplitude';
import CaretOutlined from '../icons/caret-outlined';
import { baseURLStructured } from '../user-management/invite-user-form';
import ApplyStylesMenu from '../screen-editor/apply-styles-menu';
import PersonalVarEditor from '../personal-var-editor/personal-var-editor';
import { loadTourAnnotationsAndDatasets } from '../../action/creator';
import { TState } from '../../reducer';
import ShareAsVideo from './share-as-video';

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

enum PublicationState {
  UNPUBLISHED,
  PUBLISHED,
  OUTDATED
}
const getPublicationState = (tour: P_RespTour): PublicationState => {
  if (!tour.lastPublishedDate) return PublicationState.UNPUBLISHED;
  if (tour.lastPublishedDate >= tour.updatedAt) return PublicationState.PUBLISHED;
  if (tour.lastPublishedDate < tour.updatedAt) return PublicationState.OUTDATED;

  return PublicationState.OUTDATED;
};

const collapseTabStyle = {
  marginBottom: 18,
  background: '#f5f5f5',
  borderRadius: '4px',
  border: 'none',
};

interface Props {
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  relativeUrl: string;
  isModalVisible: boolean;
  closeModal: () => void;
  tour: P_RespTour;
  openShareModal: () => void;
  onSiteDataChange?: (site: SiteData) => void;
  isPublishing: boolean;
  setIsPublishing: (isPublishing: boolean)=> void;
  vanityDomains: P_RespVanityDomain[] | null | undefined;
  clickedFrom: 'demos' | 'analytics' | 'preview' | 'editor';
}

const enum SearchParamBy {
  UtmParam,
  UserParam
}

type UpdateBrandDataFn = <K extends keyof SiteData>(changeData: Array<[key: K, value: SiteData[K]]>) => void;

interface CTAInfoProps {
  iframeUrl: string,
  showHelpDrawer: (show: boolean) => void;
  defValue: string,
  handleParamsAdd: (params: ParamType, v: string | undefined)=>void,
  showInlinkLinkExplore: boolean,
  site: SiteData | null,
  updateBrandData: UpdateBrandDataFn,
  disableEdit:boolean,
  calledFrom: 'cta_share' | 'internal_share',
  allDomains: string[] | null;
  selectedDomain: string;
  selectDomain: (domain: string) => void;
  tour: P_RespTour;
  handleShareAsVideoChange: (value: SegmentedValue) => void;
  activeMode: INTERACTIVE_MODE;
}

function CTAInfo({ iframeUrl,
  defValue,
  handleParamsAdd,
  showInlinkLinkExplore,
  site,
  showHelpDrawer,
  updateBrandData,
  disableEdit,
  calledFrom,
  allDomains,
  selectDomain,
  selectedDomain,
  tour,
  handleShareAsVideoChange,
  activeMode,
}: CTAInfoProps): JSX.Element {
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentIpVals, setCurrentIpVals] = useState({
    navLink: site?.navLink._val || '',
    ctaText: site?.ctaText._val || '',
    ctaLink: site?.ctaLink._val || '',
  });

  useEffect(() => {
    if (!site) return;
    const keys: Array<keyof SiteData_WithProperty> = ['navLink', 'ctaText', 'ctaLink'];
    for (const key of keys) {
      if (site[key].type === PropertyType.REF) {
        setCurrentIpVals(prev => ({ ...prev, [key]: site[key]._val }));
      }
    }
  }, [site]);

  const debouncedChangeHandler = debounce(<K extends keyof Omit<SiteData, 'v'>>(property: K, value: SiteData[K]) => {
    updateBrandData([[property, value]]);

    if (!(SiteDateKeysWithProperty as string[]).includes(property)) {
      amplitudeCtaConfigChanged(property, (value as Property<string>)._val);
    } else {
      amplitudeCtaConfigChanged(property, value as string);
    }
  }, 500);

  const debouncedThemeHandler = debounce((property: 'themePreset', theme: keyof typeof SiteThemePresets) => {
    updateBrandData([
      ['themePreset', theme],
      ['bg1', SiteThemePresets[theme].bg1],
      ['bg2', SiteThemePresets[theme].bg2],
      ['headerBg', 'auto'],
    ]);
    amplitudeCtaConfigChanged(property, theme);
  }, 500);

  return (
    <>
      {site && (
      <Tags.AntCollapse
        expandIconPosition="start"
        size="small"
        bordered={false}
        style={{
          borderRadius: '4px'
        }}
        items={[
          {
            key: '1',
            label: <span className="typ-reg pseudo-link">Configure site settings</span>,
            children: (
              <div style={{ marginLeft: '1.5rem' }} className="typ-reg">
                <div className="cta-info">
                  <div>
                    <span className="cta-input-label">Upload brand logo</span>
                    <span className="typ-sm" style={{ display: 'block' }} />
                    <div className="cta-input-c">
                      <div style={{ overflow: 'hidden', flex: '1 1 auto' }}>
                        <FileInput
                          disabled={disableEdit}
                          style={{
                            backgroundColor: 'white',
                          }}
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          label=""
                          onChange={async (e) => {
                            if (e.target.files) {
                              const file = e.target.files[0];
                              if (file) {
                                setLogoUploading(true);
                                const fileUrl = await uploadImgFileObjectToAws(e.target.files[0]);
                                if (!fileUrl) return;
                                updateBrandData([['logo', createLiteralProperty(fileUrl.cdnUrl)]]);
                                amplitudeCtaConfigChanged('logo', fileUrl.cdnUrl);
                                setLogoUploading(false);
                              }
                            }
                          }}
                        />
                      </div>
                      {
                      logoUploading
                        ? <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                        : <img alt="Site page logo" src={site.logo._val} height={32} />
                    }
                      <ApplyStylesMenu
                        isGlobal={isGlobalProperty(site.logo)}
                        onApplyGlobal={() => {
                          updateBrandData([['logo', createGlobalProperty(site.logo._val, GlobalPropsPath.logo)]]);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="cta-input-label">Open link when brand logo is clicked</span>
                    <div className="cta-input-c">
                      <GTags.SimpleInput
                        className="typ-ip"
                        disabled={disableEdit}
                        value={currentIpVals.navLink}
                        placeholder="Link when brand logo is clicked"
                        onChange={(e) => {
                          const link = e.target.value;
                          setCurrentIpVals(prev => ({ ...prev, navLink: link }));
                          const formattedLink = getValidUrl(link);
                          debouncedChangeHandler('navLink', createLiteralProperty(formattedLink));
                        }}
                      />
                      <ApplyStylesMenu
                        isGlobal={isGlobalProperty(site.navLink)}
                        onApplyGlobal={() => {
                          updateBrandData([[
                            'navLink', createGlobalProperty(site.navLink._val, GlobalPropsPath.companyUrl)
                          ]]);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ width: 'calc(100% - 2rem)' }}>
                  <span className="cta-input-label">Demo Title</span>
                  <div className="cta-input-c">
                    <GTags.SimpleInput
                      className="typ-ip"
                      disabled={disableEdit}
                      placeholder="Short title of the demo"
                      defaultValue={site.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        debouncedChangeHandler('title', title);
                      }}
                    />
                  </div>
                </div>
                <div className="cta-info">
                  <div>
                    <span className="cta-input-label">CTA text</span>
                    <div className="cta-input-c">
                      <GTags.SimpleInput
                        className="typ-ip cta-input-c"
                        disabled={disableEdit}
                        placeholder="CTA Text"
                        value={currentIpVals.ctaText}
                        onChange={(e) => {
                          setCurrentIpVals(prev => ({ ...prev, ctaText: e.target.value }));
                          debouncedChangeHandler('ctaText', createLiteralProperty(e.target.value));
                        }}
                      />
                      <ApplyStylesMenu
                        isGlobal={isGlobalProperty(site.ctaText)}
                        onApplyGlobal={() => {
                          updateBrandData([['ctaText', createGlobalProperty(
                            site.ctaText._val,
                            GlobalPropsPath.customBtn1Text
                          )]]);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="cta-input-label">CTA link</span>
                    <div className="cta-input-c">
                      <GTags.SimpleInput
                        className="typ-ip cta-input-c"
                        disabled={disableEdit}
                        placeholder="CTA link"
                        value={currentIpVals.ctaLink}
                        onChange={(e) => {
                          const link = e.target.value;
                          setCurrentIpVals(prev => ({ ...prev, ctaLink: e.target.value }));
                          const formattedLink = getValidUrl(link);
                          debouncedChangeHandler('ctaLink', createLiteralProperty(formattedLink));
                        }}
                      />
                      <ApplyStylesMenu
                        isGlobal={isGlobalProperty(site.ctaLink)}
                        onApplyGlobal={() => {
                          updateBrandData([['ctaLink', createGlobalProperty(
                            site.ctaLink._val,
                            GlobalPropsPath.customBtn1URL,
                          )]]);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="type-reg">Choose a background theme</div>
                  <Tags.ColorThemeCon>
                    <div className="card-con">
                      {Object.entries(SiteThemePresets).map(([presentName, preset]) => (
                        <Tags.ThemeCard
                          key={presentName}
                          style={{
                            background: `linear-gradient(33deg, ${preset.bg1}, ${preset.bg2})`
                          }}
                          className={`${presentName === site.themePreset ? 'sel' : undefined}`}
                          bg={preset.bg1}
                          onMouseUp={() => {
                            debouncedThemeHandler('themePreset', presentName as keyof typeof SiteThemePresets);
                          }}
                        />
                      ))}
                    </div>
                  </Tags.ColorThemeCon>
                </div>
                <Tags.AntCollapse
                  expandIconPosition="start"
                  size="small"
                  bordered={false}
                  style={{
                    borderRadius: '4px'
                  }}
                  items={[
                    {
                      key: '1',
                      label: <span className="typ-reg pseudo-link">Advanced</span>,
                      children: (
                        <div className="cta-info cta-color" style={{ margin: '0 0 0 1rem' }}>
                          <div>
                            <span className="cta-input-label">Header Background color</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              value={site.headerBg}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('headerBg', e.toHexString());
                              }}
                            />
                          </div>
                          <div>
                            <span className="cta-input-label">Background color 1</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              value={site.bg1}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('bg1', e.toHexString());
                              }}
                            />
                          </div>
                          <div>
                            <span className="cta-input-label">Background color 2</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              value={site.bg2}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('bg2', e.toHexString());
                              }}
                            />
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )
          }
        ]}
      />
      )}

      <span className="typ-sm pseudo-link" style={{ marginLeft: '1.8rem', borderBottom: 'none' }} onMouseUp={() => showHelpDrawer(true)}>Learn more about site settings</span>
      <p style={{ margin: '1rem 0 0.25rem' }} className="typ-reg">
        Copy the following URL to and use it in your HTML/JavaScript to open it in a new tab
      </p>
      <UrlCodeShare url={iframeUrl} showOpenLinkButton openEventFrom={calledFrom} />
      {
        allDomains && (
        <DomainSelect
          selectDomain={selectDomain}
          selectedDomain={selectedDomain}
          allDomains={allDomains}
        />
        )
      }
      {
        tour.info.isVideo && (
          <ShareAsVideo
            onChange={handleShareAsVideoChange}
            activeMode={activeMode}
          />
        )
      }
    </>
  );
}

export default function ShareTourModal(props: Props): JSX.Element {
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<SearchParamBy, ParamType>>({
    [SearchParamBy.UserParam]: [],
    [SearchParamBy.UtmParam]: []
  });
  const [searchParamsStr, setSearchParamsStr] = useState('');
  const [defValue, setDefValue] = useState('');
  const [localSite, setLocalSite] = useState(props.tour.site);
  const [selectedDomain, setSelectedDomain] = useState<string>(baseURLStructured.host);
  const [allDomains, setAllDomains] = useState<string[] | null>(null);
  const [loadingAnns, setLoadingAnns] = useState(true);
  const [annotationsForScreens, setAnnotationsForScreens] = useState<Record<string, IAnnotationConfig[]> | null>(null);
  const [datasets, setDatasets] = useState<P_Dataset[] | null>(null);
  const [edits, setEdits] = useState<EditItem[]>([]);
  const dispatch: ThunkDispatch<TState, void, AnyAction> = useDispatch();
  const [activeMode, setActiveMode] = useState(INTERACTIVE_MODE.INTERACTIVE_TOUR);

  useEffect(() => {
    const allParams = [...searchParams[SearchParamBy.UserParam], ...searchParams[SearchParamBy.UtmParam]];
    if (allParams.length) setSearchParamsStr(`?${allParams.map(p => `${p.mapping}=${p.value}`).join('&')}`);
    else setSearchParamsStr('');
  }, [searchParams]);

  useEffect(() => {
    setLocalSite(props.tour.site);
  }, [props.tour.site]);

  useEffect(() => {
    if (props.vanityDomains && props.vanityDomains.length > 0) {
      setAllDomains([baseURLStructured.host, ...props.vanityDomains.map(item => item.domainName)]);
    } else {
      setAllDomains(null);
    }
  }, [props.vanityDomains]);

  const iframeEmbedCopyHandler = (): void => {
    traceEvent(AMPLITUDE_EVENTS.EMBED_TOUR, {
      embed_type: 'ifame_html',
      tour_url: createIframeSrc(`/${IFRAME_BASE_URL}/${props.relativeUrl}`)
    }, [CmnEvtProp.EMAIL]);
  };

  const handleParamsAdd = (params: ParamType, v: string | undefined): void => {
    setDefValue(v || '');
    setSearchParams({
      ...searchParams,
      [SearchParamBy.UtmParam]: params
    });
  };

  const updateBrandData: UpdateBrandDataFn = <K extends keyof SiteData>(
    changeData: Array<[key: K, value: SiteData[K]]>
  ): void => {
    if (localSite && props.onSiteDataChange) {
      let newSiteData = { ...localSite };
      for (const changeItem of changeData) {
        newSiteData = {
          ...newSiteData,
          [changeItem[0]]: changeItem[1]
        };
      }
      props.onSiteDataChange(newSiteData);
      setLocalSite(newSiteData);
    }
  };

  const getBaseURl = (): string => {
    if (selectedDomain === baseURLStructured.host && selectedDomain === 'localhost:3000') {
      return `http://${selectedDomain}`;
    }
    return `https://${selectedDomain}`;
  };

  useEffect(() => {
    if (props.isModalVisible) {
      fetchAnns();
    }
  }, [props.tour, props.isModalVisible]);

  async function fetchAnns(): Promise<void> {
    if (getPublicationState(props.tour) === PublicationState.UNPUBLISHED) return;
    try {
      setLoadingAnns(true);
      const data = await dispatch(loadTourAnnotationsAndDatasets(props.tour.rid, true));
      setAnnotationsForScreens(data.annotations);
      setDatasets(data.datasets);
      setEdits(data.globalEdits);
      setLoadingAnns(false);
    } catch (e) {
      raiseDeferredError(e as Error);
    }
  }

  const handleShareAsVideoChange = (value: SegmentedValue): void => {
    let initialParams = searchParamsStr;
    let activeSegment = INTERACTIVE_MODE.INTERACTIVE_TOUR;
    if (value === INTERACTIVE_MODE.INTERACTIVE_TOUR) {
      // remove mode param
      initialParams = updateQueryParams(searchParamsStr, 'mode');
    } else {
      // add mode = video
      initialParams = updateQueryParams(searchParamsStr, 'mode', 'video');
      activeSegment = INTERACTIVE_MODE.INTERACTIVE_VIDEO;
    }

    if (initialParams.length !== 0) initialParams = `?${initialParams}`;
    setSearchParamsStr(initialParams);
    setActiveMode(activeSegment);
  };

  return (
    <>
      <GTags.BorderedModal
        donotShowHeaderStip
        containerBg="#f5f5f5"
        focusTriggerAfterClose={false}
        className="share-modal"
        open={props.isModalVisible}
        onCancel={props.closeModal}
        centered
        width={(props.tour && getPublicationState(props.tour) !== PublicationState.UNPUBLISHED) ? '90vw' : '60vw'}
        footer={null}
      >
        <div style={{
          display: 'flex',
          alignItems: 'start',
          gap: '1rem',
          justifyContent: 'space-evenly'
        }}
        >
          <Tags.ModalBodyCon
            style={{
              width: (
                props.tour && getPublicationState(props.tour) !== PublicationState.UNPUBLISHED)
                ? '70%'
                : '100%'
            }}
          >
            {props.isPublishing ? (
              <div className="typ-h1">Publishing...</div>
            ) : (
              <div className="section-con">
                {isPublishFailed && (
                <>
                  <div
                    className="err-line typ-h2"
                    style={{
                      marginRight: '3rem'
                    }}
                  >Failed to publish the tour. Try again.
                  </div>
                </>
                )}
                {props.tour && getPublicationState(props.tour) === PublicationState.UNPUBLISHED && (
                <div>
                  <div className="typ-h1" style={{ marginBottom: '0.5rem' }}>
                    You haven't published this demo yet!
                  </div>
                  <br />
                  <div className="pub-btn-txt-con">
                    <div className="typ-h2" style={{ marginBottom: '0.5rem' }}>
                      <p>
                        For a demo to go live, you’ll need to publish it.
                      </p>
                      <p className="type-sm">
                        Please click on <em>publish</em> button once you are done making all changes.
                      </p>
                    </div>
                    <PublishButton
                      minWidth="180px"
                      setIsPublishFailed={setIsPublishFailed}
                      tour={props.tour}
                      publishTour={props.publishTour}
                      openShareModal={props.openShareModal}
                      setIsPublishing={props.setIsPublishing}
                      clickedFrom={`${props.clickedFrom}_share_modal`}
                    />
                  </div>
                </div>
                )}
                {!isPublishFailed
                && props.tour
                && getPublicationState(props.tour) === PublicationState.PUBLISHED
                && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  >
                    <div>
                      <div className="typ-h1 sec-head"> Latest version of your demo is already published</div>
                      <div className="typ-sm">Publish date:
                        <span>{dateTimeFormat(props.tour.lastPublishedDate)}</span>
                      </div>
                    </div>
                    <div>
                      <PublishButton
                        minWidth="180px"
                        setIsPublishFailed={setIsPublishFailed}
                        tour={props.tour}
                        publishTour={props.publishTour}
                        openShareModal={props.openShareModal}
                        setIsPublishing={props.setIsPublishing}
                        clickedFrom={`${props.clickedFrom}_share_modal`}
                        title="Force publish"
                      />
                    </div>
                  </div>
                )}

                {props.tour && getPublicationState(props.tour) === PublicationState.OUTDATED && (
                <>
                  <div className="pub-btn-txt-con">
                    <div>
                      <div className="typ-h1">You have unpublished changes</div>
                      <p className="typ-sm">
                        Last publish date: <span>{dateTimeFormat(props.tour.lastPublishedDate)}</span>
                      </p>
                    </div>
                    <PublishButton
                      minWidth="180px"
                      setIsPublishFailed={setIsPublishFailed}
                      tour={props.tour}
                      publishTour={props.publishTour}
                      openShareModal={props.openShareModal}
                      setIsPublishing={props.setIsPublishing}
                      clickedFrom={`${props.clickedFrom}_share_modal`}
                    />
                  </div>
                </>
                )}
              </div>
            )}

            {!isPublishFailed
            && props.tour
            && (getPublicationState(props.tour) !== PublicationState.UNPUBLISHED)
            && (
            <Tags.EmbedCon>
              <div className="typ-h2" style={{ marginBottom: '1.5rem' }}>
                How do you want to use this demo?
              </div>
              <Collapse
                bordered={false}
                style={{ background: '#f5f5f5' }}
                defaultActiveKey="2"
                accordion
                onChange={(e) => {
                  if (e.length) {
                    if (e[0] === '1') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_EMBED_DEMO,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    } else if (e[0] === '2') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_CTA_SHARE,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    } else if (e[0] === '3') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_INTERNAL_SHARE,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    }
                  }
                }}
                items={[{
                  key: '1',
                  label: <span className="typ-h2">Embed in a landing page</span>,
                  children: (
                    <div className="collapse-content typ-reg">
                      <p style={{ margin: '0 0 1rem' }}>
                        Copy the following code & paste it in the webpage where
                        you want to embed the interactive demo as an iframe.
                      </p>
                      <IframeCodeSnippet
                        copyHandler={iframeEmbedCopyHandler}
                        src={`${getBaseURl()}/${IFRAME_BASE_URL}${props.relativeUrl}${searchParamsStr}`}
                      />
                      {
                        allDomains && (
                          <DomainSelect
                            selectDomain={setSelectedDomain}
                            selectedDomain={selectedDomain}
                            allDomains={allDomains}
                          />
                        )
                      }
                      {
                        props.tour.info.isVideo && (
                          <ShareAsVideo
                            onChange={handleShareAsVideoChange}
                            activeMode={activeMode}
                          />
                        )
                      }
                    </div>
                  ),
                  style: collapseTabStyle
                },
                {
                  key: '2',
                  label: <span className="typ-h2">Open this demo in a new tab (on the click of a button)</span>,
                  children: (
                    <div className="collapse-content type-reg">
                      <CTAInfo
                        iframeUrl={`${getBaseURl()}/${LIVE_BASE_URL}${props.relativeUrl}${searchParamsStr}`}
                        defValue={defValue}
                        handleParamsAdd={handleParamsAdd}
                        showInlinkLinkExplore
                        site={localSite}
                        showHelpDrawer={setShowHelpDrawer}
                        updateBrandData={updateBrandData}
                        disableEdit={props.onSiteDataChange === undefined}
                        calledFrom="cta_share"
                        selectDomain={setSelectedDomain}
                        selectedDomain={selectedDomain}
                        allDomains={allDomains}
                        tour={props.tour}
                        handleShareAsVideoChange={handleShareAsVideoChange}
                        activeMode={activeMode}
                      />
                    </div>
                  ),
                  style: collapseTabStyle
                }
                ]}
              />
            </Tags.EmbedCon>
            )}
          </Tags.ModalBodyCon>
          <Drawer
            title="Site settings"
            open={showHelpDrawer}
            size="large"
            onClose={() => setShowHelpDrawer(false)}
          >
            <p className="typ-reg">
              When you open a Fable's demo in a standalone browser's tab (contrary to, embedding a demo in a landing page),
              you can configure every aspect of the page that opens in the new tab.
            </p>
            <p className="typ-reg">
              We call this configuration <em>Site settings</em>. Following is an example of all the things that you
              can configure using the <em>site settings</em> section.
            </p>
            <img src="/site.png" height={480} alt="site wireframe" />
          </Drawer>
          {props.tour
          && annotationsForScreens
          && datasets
          && getPublicationState(props.tour) !== PublicationState.UNPUBLISHED && (
            <div style={{
              background: 'white',
              marginTop: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '16px'
            }}
            >
              <PersonalVarEditor
                datasets={datasets}
                annotationsForScreens={annotationsForScreens}
                tour={props.tour}
                originalPersVarsParams={searchParamsStr}
                changePersVarParams={(persVarsParamsStr) => {
                  setSearchParamsStr(persVarsParamsStr);
                }}
                isLoading={loadingAnns}
                setShowEditor={() => { /* noop */ }}
                edits={edits}
              />
            </div>
          )}
        </div>

      </GTags.BorderedModal>
    </>
  );
}

interface DomainSelectProps {
  allDomains: string[];
  selectedDomain: string;
  selectDomain: (domain: string) => void;
}

function DomainSelect(props: DomainSelectProps): JSX.Element {
  return (
    <Tags.DomainSelectCon>
      <div className="typ-reg" style={{ marginBottom: '0.25rem' }}>
        Select Domain:
      </div>
      <GTags.FableSelect
        defaultValue={props.selectedDomain}
        className="typ-ip"
        value={props.selectedDomain}
        size="small"
        bordered={false}
        options={props.allDomains.map(v => ({
          value: v,
          label: v,
        }))}
        onChange={(e) => {
          props.selectDomain(e as string);
        }}
        suffixIcon={<CaretOutlined dir="down" />}
      />
    </Tags.DomainSelectCon>
  );
}
