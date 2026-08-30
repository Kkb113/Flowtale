import {
  BarChartOutlined,
  CalendarOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  LinkOutlined,
  LogoutOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SwapOutlined,
  WarningFilled,
  ExclamationCircleFilled,
  WalletFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Plan, RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, ScreenDiagnostics } from '@fable/common/dist/types';
import { Tooltip, Button as AntButton, Drawer, Popover } from 'antd';
import React, { Dispatch, ReactElement, SetStateAction, Suspense, lazy, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { traceEvent } from '@fable/common/dist/amplitude';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import FableQuill from '../../assets/fable-quill.svg';
import FableLogo from '../../assets/fableLogo.svg';
import * as GTags from '../../common-styled';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import Input from '../input';
import * as Tags from './styled';
import { AI_PARAM, P_RespDemoHub, SiteData, TourMainValidity } from '../../types';
import { PREVIEW_BASE_URL } from '../../constants';
import { amplitudeShareModalOpen } from '../../amplitude';
import { UserGuideMsg } from '../../user-guides/types';
import UserGuideListInPopover from './user-guide-list-in-popover';
import { isAIParamPresent, sendPreviewHeaderClick } from '../../utils';
import BuyMoreCredit from '../create-tour/buy-more-credit';
import Button from '../button';

const PublishButton = lazy(() => import('../publish-preview/publish-button'));
const ShareTourModal = lazy(() => import('../publish-preview/share-modal'));

interface IOwnProps {
  showOnboardingGuides?: boolean;
  userGuidesToShow?: string[];
  rBtnTxt?: string;
  shouldShowFullLogo?: boolean;
  navigateToWhenLogoIsClicked?: string;
  titleElOnLeft?: ReactElement;
  leftElGroups?: ReactElement[];
  rightElGroups?: ReactElement[];
  principal?: RespUser | null;
  org: RespOrg | null;
  titleText?: string;
  subs: P_RespSubscription | null;
  showRenameIcon?: boolean;
  renameScreen?: (newVal: string) => void;
  tourMainValidity?: TourMainValidity;
  isAutoSaving?: boolean;
  canvasOptions?: {
    resetZoom: () => void;
    showAnnText: boolean;
    setShowAnnText: Dispatch<SetStateAction<boolean>>;
    downloadTourData: () => void;
  }
  publishOptions?: ReactElement;
  publishTour?: (tour: P_RespTour) => Promise<boolean>;
  tour: P_RespTour | null;
  onLogoClicked?: () => void;
  isJourneyCTASet?: boolean;
  lastAnnHasCTA?: boolean;
  isEntryPointMediaAnn?: null | 'main' | 'module';
  screenDiagnostics?: ScreenDiagnostics[];
  onSiteDataChange?: (site: SiteData) => void;
  showCalendar?: boolean;
  minimalHeader?: boolean;
  vanityDomains?: P_RespVanityDomain[] | null;
  demoHub?: P_RespDemoHub | null;
  checkCredit?: ()=>Promise<RespSubscription>;
  clickedFrom?: 'analytics' | 'preview' | 'editor';
}

export type HeaderProps = IOwnProps;

const CMN_HEADER_GRP_STYLE = {
  display: 'flex',
  gap: '1rem'
};

const CMN_HEADER_GRP_DIVISION = {
  borderLeft: '1px solid #ffffff42',
  padding: '0.25rem 0.5rem'
};

function Header(props: IOwnProps): JSX.Element {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showRenameScreenModal, setShowRenameScreenModal] = useState(false);
  const [screenName, setScreenName] = useState(props.titleText || '');
  const [showWarningDrawer, setShowWarningDrawer] = useState(false);
  const [isWarningPresent, setIsWarningPresent] = useState(false);
  const [showUserGuidePopover, setShowUserGuidePopover] = useState(false);
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  useEffect(() => {
    let isWarning = false;
    if (!props.isJourneyCTASet
    || !props.lastAnnHasCTA
    || props.tourMainValidity !== TourMainValidity.Valid
    || props.screenDiagnostics?.length) {
      isWarning = true;
    }

    if (props.demoHub) {
      isWarning = false;
    }
    setIsWarningPresent(isWarning);
  }, [props.isJourneyCTASet, props.lastAnnHasCTA, props.screenDiagnostics, props.tourMainValidity, props.demoHub]);

  const handleRenameScreenModalOk = (): void => {
    const newVal = screenName.trim().replace(/\s+/, ' ');
    if (newVal.toLowerCase() === props.titleText!.toLowerCase()) {
      setShowRenameScreenModal(false);
      return;
    }
    props.renameScreen!(newVal);
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenModalCancel = (): void => {
    setShowRenameScreenModal(false);
  };

  const handleRenameScreenFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    handleRenameScreenModalOk();
  };

  const closeModal = (): void => {
    setIsModalVisible(false);
  };

  const getTooltipTitle = (): string => {
    switch (props.tourMainValidity) {
      case TourMainValidity.Journey_Main_Not_Present:
        return 'Journey entry point is not set';
      case TourMainValidity.Main_Not_Present:
        return 'Demo\'s entry point is not set';
      case TourMainValidity.Main_Not_Set:
        return 'Demo\'s entry point is not present';
      default:
        return '';
    }
  };

  const getDrawerOpenState = (): boolean => {
    if (showWarningDrawer) return true;
    if (params.screenId) return false;

    switch (props.tourMainValidity) {
      case TourMainValidity.Journey_Main_Not_Present:
      case TourMainValidity.Main_Not_Present:
      case TourMainValidity.Main_Not_Set:
        return true;
      default:
        return false;
    }
  };

  const handlePublishTour = (tour: P_RespTour): Promise<boolean> => {
    sendPreviewHeaderClick();
    return props.publishTour!(tour);
  };

  const showUpgradeButton = props.subs && (props.subs.paymentPlan === Plan.SOLO || props.subs.paymentPlan === Plan.STARTUP);

  return (
    <Suspense fallback={<></>}>
      <Tags.Con style={{ color: '#fff' }}>
        <Tags.LMenuCon style={CMN_HEADER_GRP_STYLE}>
          <div style={{ ...CMN_HEADER_GRP_STYLE, gap: '0.5rem' }}>
            {props.shouldShowFullLogo ? (
              <Tags.ConLogoImg src={FableLogo} alt="Fable logo" />
            ) : (
              <Link
                onClick={() => props.onLogoClicked && props.onLogoClicked()}
                to={props.navigateToWhenLogoIsClicked!}
              >
                <Tags.ConLogoImg
                  id="fable-logo-screen-editor"
                  src={FableQuill}
                  alt="Fable logo"
                  style={{ height: '2rem', cursor: 'pointer' }}
                />
              </Link>
            )}
            {showUpgradeButton && (
            <Link
              to="/billing"
              style={{
                alignSelf: 'center',
                textDecoration: 'none'
              }}
            >
              <Button
                size="small"
                style={{
                  background: '#fedf64',
                  color: 'black',
                  width: '80px',
                }}
              >Upgrade
              </Button>
            </Link>
            )}
            {
            props.titleElOnLeft
            && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                {props.titleElOnLeft}
                {props.showRenameIcon && (
                  <EditOutlined className="show-on-hover" onClick={() => setShowRenameScreenModal(true)} />
                )}
              </div>
            )
          }
          </div>
          <>
            {(props.leftElGroups || []).map((e, i) => (
              <div
                style={{ ...CMN_HEADER_GRP_STYLE, ...CMN_HEADER_GRP_DIVISION }}
                key={`lg-${i}`}
              >
                {e}
              </div>
            ))}
          </>
        </Tags.LMenuCon>
        <Tags.RMenuCon>
          <div style={{
            display: 'flex',
            justifyContent: 'end',
            padding: '0 0.5rem 0.25rem 0',
            animation: props.isAutoSaving ? 'blink 2s linear infinite' : 'none',
            visibility: props.isAutoSaving ? 'visible' : 'hidden'
          }}
          >
            <SaveOutlined style={{ color: 'white' }} />
          </div>
          {(props.rightElGroups || []).length > 0 && (
          <Tags.MenuItem style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.3)',
            paddingRight: '16px',
            marginRight: '10px'
          }}
          >
            {(props.rightElGroups || []).map((e, i) => (
              <div
                style={{ ...CMN_HEADER_GRP_STYLE }}
                key={`lg-${i}`}
              >
                {e}
              </div>
            ))}
          </Tags.MenuItem>
          )}

          {(props.tour || props.demoHub) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: !props.minimalHeader ? '1rem' : 0,
            paddingRight: '1rem',
            borderRight: !props.minimalHeader ? '1px solid #ffffff42' : 'none'
          }}
          >
            {
              !props.minimalHeader && isWarningPresent && (
                <Tags.MenuItem>
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<Tags.WarningIcon />}
                    onClick={(e) => {
                      setShowWarningDrawer(true);
                    }}
                  />
                </Tags.MenuItem>
              )
            }
            {!location.pathname.startsWith('/preview') && !location.pathname.startsWith('/hub') && (
              <>
                <Tags.MenuItem style={{
                  borderRight: !location.pathname.startsWith('/analytics') ? '1px solid rgba(255, 255, 255, 0.3)'
                    : 'none',
                  paddingRight: '16px'
                }}
                >
                  <Tooltip
                    open={!getTooltipTitle() ? false : undefined}
                    title={getTooltipTitle}
                  >
                    <AntButton
                      id="step-1"
                      size="small"
                      className="sec-btn typ-btn"
                      type="default"
                      icon={<CaretRightOutlined
                        style={{ color: 'white' }}
                      />}
                      style={{
                        padding: '0 0.8rem',
                        height: '30px',
                        borderRadius: '16px',
                        backgroundColor: '#160245',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 500
                      }}
                      onClick={(e) => {
                        import('@fable/common/dist/amplitude').then((amp) => {
                          amp.traceEvent(AMPLITUDE_EVENTS.TOUR_PREVIEW_CLICKED, {
                            preview_clicked_from: props.clickedFrom || 'header'
                          }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
                        }).catch((err) => {
                          console.log('error in amplitude event', err);
                        });

                        const param = isAIParamPresent() ? `?${AI_PARAM}` : '';
                        navigate(`/${PREVIEW_BASE_URL}/demo/${props.tour?.rid}${param}`);
                      }}
                      disabled={props.tourMainValidity !== TourMainValidity.Valid}
                    >
                      Preview
                    </AntButton>
                  </Tooltip>
                </Tags.MenuItem>
                {!location.pathname.startsWith('/analytics') && (
                  <Tags.MenuItem>
                    <Tooltip title="Insights" overlayStyle={{ fontSize: '0.75rem' }}>
                      <Link to={`/analytics/demo/${props.tour!.rid}`}>
                        <AntButton
                          size="small"
                          shape="circle"
                          type="text"
                          icon={<BarChartOutlined
                            style={{ color: 'white' }}
                          />}
                          onClick={() => {
                            traceEvent(
                              AMPLITUDE_EVENTS.VIEW_DEMO_ANALYTICS,
                              { analytics_clicked_from: `${props.clickedFrom}_header`,
                              },
                              [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                            );
                          }}
                        />
                      </Link>
                    </Tooltip>
                  </Tags.MenuItem>
                )}
              </>
            )}
            {
              props.canvasOptions && (
                <Tags.MenuItem>
                  <GTags.StyledPopover
                    trigger="click"
                    content={
                      <Tags.CanvasOptionsCon>
                        <GTags.PopoverOption
                          type="button"
                          onClick={() => props.canvasOptions!.setShowAnnText((prev) => !prev)}
                        >
                          {props.canvasOptions.showAnnText ? 'Hide ' : 'Show '}
                          annotation text
                        </GTags.PopoverOption>
                        <GTags.PopoverOption
                          type="button"
                          onClick={props.canvasOptions.resetZoom}
                          style={{ borderBottom: 'none' }}
                        >
                          Reset canvas position
                        </GTags.PopoverOption>
                        <GTags.PopoverOption
                          type="button"
                          onClick={props.canvasOptions.downloadTourData}
                          style={{ borderBottom: 'none' }}
                        >
                          Download datafile
                        </GTags.PopoverOption>
                      </Tags.CanvasOptionsCon>
                    }
                  >
                    <div
                      style={{
                        color: 'white',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                      id="step-3"
                    >
                      <AntButton
                        size="small"
                        shape="circle"
                        type="text"
                        icon={<MoreOutlined
                          style={{ color: 'white' }}
                        />}
                        onClick={(e) => {
                        }}
                      />
                    </div>
                  </GTags.StyledPopover>
                </Tags.MenuItem>
              )
            }
            {props.publishOptions && (props.publishOptions)}
            {props.publishTour && (
              <Tooltip
                title={getTooltipTitle}
                open={!getTooltipTitle() ? false : undefined}
              >
                <div
                  className="publish-btn"
                  style={{
                    borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
                    paddingLeft: '16px'
                  }}
                >
                  {
                     !(props.tour && props.tour.lastPublishedDate)
                       ? <PublishButton
                           disabled={props.tourMainValidity !== TourMainValidity.Valid}
                           setIsPublishFailed={setIsPublishFailed}
                           setIsPublishing={setIsPublishing}
                           publishTour={handlePublishTour}
                           tour={props.tour}
                           size="medium"
                           openShareModal={() => {
                             setIsModalVisible(true);
                           }}
                           isPublishing={isPublishing}
                           clickedFrom="header"
                           title="Share"
                       />
                       : (
                         <Button
                           size="medium"
                           id="step-2"
                           style={{ height: '30px', paddingLeft: '1.2rem', paddingRight: '1.2rem' }}
                           onClick={() => {
                             props.clickedFrom && amplitudeShareModalOpen(props.clickedFrom);
                             setIsModalVisible(true);
                           }}
                         >
                           <ShareAltOutlined /> Share
                         </Button>
                       )
                    }
                </div>
              </Tooltip>
            )}
          </div>
          )}

          {props.rBtnTxt && (
          <Tags.MenuItem>
            <AntButton shape="round" size="middle">
              {props.rBtnTxt}
            </AntButton>
          </Tags.MenuItem>
          )}
          {!props.minimalHeader && (
            <>
              {props.showCalendar && (
                <Tooltip title="Book a free consultation" overlayStyle={{ fontSize: '0.75rem' }}>
                  <div
                    style={{
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      marginRight: '0.75rem'
                    }}
                  >
                    <a
                      href="https://www.sharefable.com/get-a-demo?ref=app_canvas"
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', color: 'white' }}
                    >
                      <CalendarOutlined />
                    </a>
                  </div>
                </Tooltip>

              )}
              {props.showOnboardingGuides && (
              <Popover
                open={showUserGuidePopover}
                onOpenChange={visible => setShowUserGuidePopover(visible)}
                trigger="click"
                placement="bottom"
                content={(
                  <div style={{ width: '25rem' }}>
                    <div className="typ-h2" style={{ marginBottom: '1rem' }}>
                      Learn how to use Fable
                    </div>
                    {props.userGuidesToShow?.length && props.tour && (
                    <div onClick={() => {
                      setShowUserGuidePopover(false);
                      window.parent.postMessage({ type: UserGuideMsg.RESET_KEY }, '*');
                    }}
                    >
                      <UserGuideListInPopover tour={props.tour} userGuidesToShow={props.userGuidesToShow} />
                    </div>
                    )}
                    <GTags.HelpCenterLink
                      className="typ-h2"
                      href="https://help.sharefable.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LinkOutlined /> Get help from our help center
                    </GTags.HelpCenterLink>
                    <GTags.HelpCenterLink
                      className="typ-h2"
                      href="https://www.sharefable.com/contact-support"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LinkOutlined /> Contact us
                    </GTags.HelpCenterLink>
                  </div>
              )}
              >
                <div
                  style={{
                    color: 'white',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    marginRight: '0.75rem'
                  }}
                >
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<QuestionCircleOutlined style={{ color: 'white' }} />}
                    onClick={() => setShowUserGuidePopover(prevState => !prevState)}
                  />
                </div>
              </Popover>
              )}
            </>
          )}
          {props.subs && (
            <Tags.MenuItem style={{ display: 'flex' }}>
              <GTags.StyledPopover
                trigger="click"
                placement="bottom"
                content={
                  <div onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  >
                    <GTags.PopoverMenuItem nonit>
                      <WalletFilled style={{
                        marginRight: '0.25rem',
                      }}
                      />
                      {props.subs.availableCredits}
                      <div style={{ fontSize: '0.65rem' }}>Credit available</div>
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItemDivider />
                    <GTags.PopoverMenuItem nonit>
                      <div style={{ fontSize: '0.65rem', lineHeight: '1rem', marginBottom: '0.75rem' }}>
                        Buy more credit for <br />Quilly, your AI Demo Copilot
                      </div>
                      <BuyMoreCredit
                        currentCredit={props.subs.availableCredits}
                        showCreditInfo={false}
                        checkCredit={props.checkCredit!}
                        clickedFrom="header"
                      />
                    </GTags.PopoverMenuItem>
                  </div>
                }
              >
                <WalletFilled style={{
                  marginRight: '0.75rem',
                  color: '#ffdf65',
                }}
                />
              </GTags.StyledPopover>
            </Tags.MenuItem>
          )}
          {props.principal && (
          <Tags.MenuItem style={{ display: 'flex' }}>
            <GTags.StyledPopover
              trigger="click"
              placement="bottomRight"
              content={
                <div onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                >
                  <GTags.PopoverMenuItem nonit>
                    {`${props.principal.firstName} ${props.principal.lastName}`}
                    <div style={{ fontSize: '0.65rem' }}>{props.principal.email}</div>
                  </GTags.PopoverMenuItem>
                  {props.org && (
                    <>
                      <GTags.PopoverMenuItemDivider />
                      <GTags.PopoverMenuItem nonit>
                        <div style={{ fontSize: '0.65rem' }}>Active Organization</div>
                        <b>{props.org.displayName}</b>
                      </GTags.PopoverMenuItem>
                      <GTags.PopoverMenuItemDivider />
                      <GTags.PopoverMenuItem onClick={() => {
                        window.location.href = '/select-org';
                      }}
                      >
                        <SwapOutlined />&nbsp;&nbsp;Switch organization
                      </GTags.PopoverMenuItem>
                    </>
                  )}
                  <GTags.PopoverMenuItem onClick={() => {
                    window.location.href = '/logout';
                  }}
                  >
                    <LogoutOutlined />&nbsp;&nbsp;Logout
                  </GTags.PopoverMenuItem>
                </div>
              }
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}
                id="step-3"
              >
                <GTags.Avatar glow sl src={props.principal?.avatar} alt="pic" referrerPolicy="no-referrer" />
                <CaretDownOutlined />
              </div>
            </GTags.StyledPopover>
          </Tags.MenuItem>
          )}
        </Tags.RMenuCon>

        {props.tour && props.publishTour && <ShareTourModal
          publishTour={props.publishTour}
          tour={props.tour!}
          relativeUrl={`/demo/${props.tour?.rid}`}
          isModalVisible={isModalVisible}
          closeModal={closeModal}
          openShareModal={() => {
            setIsModalVisible(true);
          }}
          onSiteDataChange={props.onSiteDataChange}
          isPublishing={isPublishing}
          setIsPublishing={setIsPublishing}
          vanityDomains={props.vanityDomains}
          clickedFrom={props.clickedFrom || 'demos'}
        />}
        <GTags.BorderedModal
          style={{ height: '10px' }}
          title="Rename Screen"
          open={showRenameScreenModal}
          onOk={handleRenameScreenModalOk}
          onCancel={handleRenameScreenModalCancel}
        >
          <form
            onSubmit={handleRenameScreenFormSubmit}
            style={{ paddingTop: '0.75rem' }}
          >
            <Input
              label="What would you like to rename the screen?"
              id="renameScreen"
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
            />
          </form>
        </GTags.BorderedModal>

        <Drawer
          rootStyle={{ transform: 'translateY(45px)' }}
          contentWrapperStyle={{
            boxShadow: 'none',
            borderLeft: '2px solid #cdcdcd'
          }}
          width={240}
          mask={false}
          closable={showWarningDrawer}
          title="Fix the following items before you embed this demo"
          onClose={() => {
            setShowWarningDrawer(false);
          }}
          open={getDrawerOpenState()}
        >
          <Tags.DrawerBodyCon>
            {props.tourMainValidity !== TourMainValidity.Valid
              && (
              <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
                Issues with the demo
              </div>
              )}

            <div style={{ flex: '0.8' }}>
              {props.tourMainValidity === TourMainValidity.Main_Not_Set
                && (
                  <Tags.MainNotSetContent>
                    <ExclamationCircleFilled style={{ color: 'red' }} />
                    &nbsp; Entry point of the demo is not set.
                    <a
                      href="https://help.sharefable.com/Editing-Demos/Setting-an-Entry-Point"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LinkOutlined /> Check here how to set the entry point.
                    </a>
                  </Tags.MainNotSetContent>
                )}

              {props.tourMainValidity === TourMainValidity.Main_Not_Present
                  && (
                    <Tags.MainNotSetContent>
                      <WarningFilled style={{ color: '#FF7450' }} />
                      &nbsp; Entry point of the demo is not valid. Please reset it.
                      <a
                        href="https://help.sharefable.com/Editing-Demos/Setting-an-Entry-Point"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkOutlined /> Check here how to set the entry point.
                      </a>
                    </Tags.MainNotSetContent>
                  )}

              {props.tourMainValidity === TourMainValidity.Journey_Main_Not_Present
                && (
                  <Tags.MainNotSetContent>
                    <ExclamationCircleFilled style={{ color: 'red' }} />
                    &nbsp; Entry point of one of the modules is not valid. Please reset it.
                  </Tags.MainNotSetContent>
                )}
            </div>

            <div style={{ flex: '0.2', borderTop: '1px solid lightgray' }}>
              {(
                props.tourMainValidity === TourMainValidity.Main_Not_Present
                || !props.lastAnnHasCTA
                || !props.isJourneyCTASet
              )
                && (
                  <div style={{ fontWeight: 500, marginTop: '1rem' }}>Warnings</div>
                )}

              {
                  props.isEntryPointMediaAnn && (
                    <Tags.MainNotSetContent>
                      <WarningFilled style={{ color: '#FF7450' }} />
                    &nbsp; Entry point
                      {props.isEntryPointMediaAnn === 'main' ? ' of the demo ' : ' of one of the modules '}
                      has a audio/video annotation. The sound won't be played by default.
                    </Tags.MainNotSetContent>
                  )
                }

              {!props.lastAnnHasCTA
                  && (
                    <Tags.MainNotSetContent>
                      <WarningFilled style={{ color: '#FF7450' }} />
                      &nbsp; Book a Demo CTA is not configured on the last annotation.
                      <a href="https://help.sharefable.com/Editing-Demos/Call-to-Actions" target="_blank" rel="noreferrer">
                        <LinkOutlined /> Check here how to configure a CTA with external URL
                      </a>
                    </Tags.MainNotSetContent>
                  )}

              {!props.isJourneyCTASet
                  && (
                    <Tags.MainNotSetContent>
                      <WarningFilled style={{ color: '#FF7450' }} />
                      &nbsp; Book a Demo CTA is not configured for modules.
                      <a href="https://help.sharefable.com/Editing-Demos/Module" target="_blank" rel="noreferrer">
                        <LinkOutlined /> Check here how to configure a CTA with external URL for modules.
                      </a>
                    </Tags.MainNotSetContent>
                  )}
              <>
                {props.screenDiagnostics
                  && props.screenDiagnostics.length > 0
                  && (
                    props.screenDiagnostics
                      .filter(diag => diag.code === 100)
                      .map((_, idx) => (
                        <Tags.MainNotSetContent key={idx}>
                          <WarningFilled style={{ color: '#FF7450' }} />
                          &nbsp; This screen was replaced by an image screen since we
                          encountered an issue while retrieving an interactive version of the page.
                          You can try rerecording the screen again.
                        </Tags.MainNotSetContent>
                      ))
                  )}
              </>
            </div>

          </Tags.DrawerBodyCon>
        </Drawer>

      </Tags.Con>
    </Suspense>
  );
}

export default Header;
