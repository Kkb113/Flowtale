import React, { useEffect, useState } from 'react';
import { timeFormat } from 'd3-time-format';
import { IDemoHubConfig, P_RespDemoHub } from '../../../types';
import * as GTags from '../../../common-styled';
import * as Tags from '../styled';
import PublishDemoBtn from './publish-demo-btn';
import DemoHubLinks from './demohub-links';

interface Props {
    demoHub : P_RespDemoHub;
    isModalOpen : boolean;
    closeModal: () => void;
    openModal: () => void;
    isPublishing : boolean;
    setIsPublishing : (isPublishing: boolean) => void;
    publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>;
    loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>;
}

enum PublicationState {
    UNPUBLISHED,
    PUBLISHED,
    OUTDATED
  }

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

const getPublicationState = (demoHub: P_RespDemoHub): PublicationState => {
  if (!demoHub.lastPublishedDate) return PublicationState.UNPUBLISHED;
  if (new Date(demoHub.lastPublishedDate) >= new Date(demoHub.updatedAt)) return PublicationState.PUBLISHED;
  if (new Date(demoHub.lastPublishedDate) < new Date(demoHub.updatedAt)) return PublicationState.OUTDATED;
  return PublicationState.OUTDATED;
};

function DemoHubShareModal(props: Props) : JSX.Element {
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [config, setConfig] = useState<IDemoHubConfig | null>(null);

  useEffect(() => {
    async function fn() {
      if (props.isModalOpen) {
        setConfig(null);
        const demoHubConfig = await props.loadDemoHubConfig(props.demoHub);
        setConfig(demoHubConfig);
      }
    }

    fn();
  }, [props.isModalOpen]);

  return (
    <GTags.BorderedModal
      donotShowHeaderStip
      open={props.isModalOpen}
      onCancel={props.closeModal}
      footer={null}
      containerBg="#f5f5f5"
      focusTriggerAfterClose={false}
      width="60vw"
      centered
    >
      <Tags.ModalBodyCon>
        {props.isPublishing ? (
          <>
            <div className="typ-h1 sec-head">Publishing...</div>
            {
              props.demoHub && config && getPublicationState(props.demoHub) !== PublicationState.UNPUBLISHED && (
                <DemoHubLinks config={config} demoHub={props.demoHub} />
              )
            }
          </>

        ) : (
          <div className="section-con">
            {isPublishFailed && (
            <>
              <div
                className="err-line typ-h2"
                style={{
                  marginRight: '3rem'
                }}
              >Failed to publish the demo hub. Try again.
              </div>
            </>
            )}
            {props.demoHub && getPublicationState(props.demoHub) === PublicationState.UNPUBLISHED && (
            <>
              <div className="typ-h1 sec-head" style={{ marginBottom: '0.5rem' }}>
                You haven't published this demo hub yet!
              </div>
              <div className="pub-btn-txt-con">
                <div className="typ-h2" style={{ marginBottom: '0.5rem' }}>
                  <p>
                    For a demo hub to go live, you’ll need to publish it.
                  </p>
                  <p className="type-sm">
                    Please click on <em>publish</em> button you are done making all changes.
                  </p>
                </div>
                <PublishDemoBtn
                  demoHub={props.demoHub}
                  isPublishing={props.isPublishing}
                  setIsPublishing={props.setIsPublishing}
                  setIsPublishFailed={setIsPublishFailed}
                  openModal={() => props.openModal()}
                  publishDemoHub={props.publishDemoHub}
                />
              </div>
            </>
            )}

            {!isPublishFailed
                && props.demoHub
                && getPublicationState(props.demoHub) === PublicationState.PUBLISHED
                && (
                  <>
                    <div className="typ-h1 sec-head"> Your demo hub is published</div>
                    <div className="typ-sm">Publish date:
                      <span>{dateTimeFormat(new Date(props.demoHub.lastPublishedDate))}</span>
                    </div>
                  </>
                )}

            {props.demoHub && getPublicationState(props.demoHub) === PublicationState.OUTDATED && (
            <>
              <div className="typ-h1 sec-head">You have unpublished changes</div>
              <div className="pub-btn-txt-con">
                <div className="typ-h2">
                  <p>
                    Your published demo hub is outdated.
                  </p>
                  <p className="typ-sm">
                    Last publish date: <span>{dateTimeFormat(new Date(props.demoHub.lastPublishedDate))}</span>
                  </p>
                </div>
                <PublishDemoBtn
                  demoHub={props.demoHub}
                  isPublishing={props.isPublishing}
                  setIsPublishing={props.setIsPublishing}
                  setIsPublishFailed={setIsPublishFailed}
                  openModal={() => props.openModal()}
                  publishDemoHub={props.publishDemoHub}
                />
              </div>
            </>
            )}
            {config && getPublicationState(props.demoHub) !== PublicationState.UNPUBLISHED && (
              <DemoHubLinks demoHub={props.demoHub} config={config} />
            )}
          </div>
        )}
      </Tags.ModalBodyCon>
    </GTags.BorderedModal>
  );
}

export default DemoHubShareModal;
