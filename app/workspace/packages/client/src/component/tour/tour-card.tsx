import {
  AlignCenterOutlined,
  BarChartOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  MoreOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { Button, Popover, Tooltip } from 'antd';
import React, { useState } from 'react';
import { ReqTourPropUpdate } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import * as GTags from '../../common-styled';
import { CtxAction } from '../../container/tours';
import { P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import ShareTourModal from '../publish-preview/share-modal';
import * as Tags from './styled';
import FableLogo from '../../assets/fable-rounded-icon.svg';
import { PREVIEW_BASE_URL } from '../../constants';
import { SiteData } from '../../types';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc } from '../../utils';

interface Props {
  tour: P_RespTour;
  handleShowModal: (tour: P_RespTour | null, ctxAction: CtxAction) => void;
  i: number;
  handleDelete: (tour: P_RespTour | null) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  vanityDomains: P_RespVanityDomain[] | null;
}

export default function TourCard({
  tour, handleShowModal, handleDelete, publishTour, updateTourProp, vanityDomains, i
}: Props): JSX.Element {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState<boolean>(false);

  const onSiteDataChange = (site: SiteData): void => {
    updateTourProp(tour.rid, 'site', site);
  };

  const disable = tour.info.locked;
  return (
    <>
      <Tags.TourCardCon
        to={disable ? '' : `/${PREVIEW_BASE_URL}/demo/${tour.rid}`}
        onClick={() => {
          if (disable) window.open('/billing', '_top');
          traceEvent(
            AMPLITUDE_EVENTS.TOUR_PREVIEW_CLICKED,
            {
              preview_clicked_from: 'demos',
              tour_url: createIframeSrc(`/demo/${tour.rid}`)
            },
            [CmnEvtProp.EMAIL]
          );
        }}
        id={i ? undefined : 'TG-1'}
      >
        <Tags.TourThumbnail />
        <Tags.CardDataCon>
          <Tags.DisplayName>
            {tour.displayName}
          </Tags.DisplayName>
          {
            tour.onboarding
              ? (
                <Tags.TourMetaDataCon>
                  <Tags.TourCreated>Sample demo created by </Tags.TourCreated>
                  <img style={{ width: '16px' }} src={FableLogo} alt="fable-logo" />
                </Tags.TourMetaDataCon>
              )
              : (
                <Tags.TourMetaDataCon>
                  Edited {tour.displayableUpdatedAt}
                  <Tags.Divider />
                  <Tags.AvatarCon>
                    Created by <GTags.Avatar src={tour.createdBy.avatar} referrerPolicy="no-referrer" />
                  </Tags.AvatarCon>
                </Tags.TourMetaDataCon>
              )
          }
        </Tags.CardDataCon>
        {disable
          ? (
            <Tags.EmbedBtn
              type="submit"
              style={{
                background: '#fedf64',
                height: '26px'
              }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: 500
              }}
              >
                Upgrade to unlock
              </span>
            </Tags.EmbedBtn>
          )
          : (
            <Tags.TourActionBtnCon>
              <Tooltip title="Copy Embed Link" overlayStyle={{ fontSize: '0.75rem' }}>
                <Tags.EmbedBtn
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsShareModalVisible(true);
                    traceEvent(
                      AMPLITUDE_EVENTS.SHARE_MODAL_OPEN,
                      {
                        share_modal_clicked_from: 'demos',
                        tour_url: createIframeSrc(`/demo/${tour.rid}`)
                      },
                      [CmnEvtProp.EMAIL]
                    );
                  }}
                >
                  <ShareAltOutlined />&nbsp;&nbsp;
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500
                  }}
                  >
                    Share
                  </span>
                </Tags.EmbedBtn>
              </Tooltip>
              {!tour.onboarding && (
              <Tooltip title="Analytics" overlayStyle={{ fontSize: '0.75rem' }}>
                <Button
                  id="TG-2"
                  style={{ padding: 0, margin: 0 }}
                  size="small"
                  shape="circle"
                  type="text"
                  icon={<BarChartOutlined />}
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    traceEvent(
                      AMPLITUDE_EVENTS.VIEW_DEMO_ANALYTICS,
                      { analytics_clicked_from: 'demos',
                        tour_url: createIframeSrc(`/demo/${tour.rid}`)
                      },
                      [CmnEvtProp.EMAIL]
                    );
                    window.open(`/analytics/demo/${tour.rid}`, '_blank')?.focus();
                  }}
                />
              </Tooltip>
              )}
              {!tour.onboarding && (
              <Popover
                content={
                  <div onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  >
                    <GTags.PopoverMenuItem
                      onMouseDown={e => {
                        window.open(`/demo/${tour.rid}`, '_top');
                        traceEvent(
                          AMPLITUDE_EVENTS.EDIT_DEMO,
                          {
                            edit_clicked_from: 'demos'
                          },
                          [CmnEvtProp.EMAIL]
                        );
                      }}
                    >
                      <EditOutlined />&nbsp;&nbsp;&nbsp;Edit Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleShowModal(tour, CtxAction.Rename)}
                    >
                      <AlignCenterOutlined />&nbsp;&nbsp;&nbsp;Rename Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleShowModal(tour, CtxAction.Duplicate)}
                    >
                      <CopyOutlined />&nbsp;&nbsp;&nbsp;Duplicate Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={e => {
                        // if demo is not published show modal
                        // else export
                        // handleExportDemo(tour);
                        handleShowModal(tour, CtxAction.Export);
                      }}
                    >
                      <ExportOutlined /> &nbsp;&nbsp;&nbsp;Export Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItemDivider color="#ff735050" />
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleDelete(tour)}
                      style={{
                        color: '#ff7350'
                      }}
                    >
                      <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Demo
                    </GTags.PopoverMenuItem>
                  </div>
            }
                trigger="focus"
                placement="right"
              >
                <Button
                  id="TG-3"
                  style={{ padding: 0, margin: 0 }}
                  size="small"
                  shape="circle"
                  type="text"
                  icon={<MoreOutlined />}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </Popover>
              )}
            </Tags.TourActionBtnCon>
          )}
      </Tags.TourCardCon>
      <ShareTourModal
        isModalVisible={isShareModalVisible}
        relativeUrl={`/demo/${tour?.rid}`}
        closeModal={() => setIsShareModalVisible(false)}
        publishTour={publishTour}
        openShareModal={() => {
          setIsShareModalVisible(true);
        }}
        tour={tour}
        onSiteDataChange={onSiteDataChange}
        setIsPublishing={setIsPublishing}
        isPublishing={isPublishing}
        vanityDomains={vanityDomains}
        clickedFrom="demos"
      />
    </>
  );
}
