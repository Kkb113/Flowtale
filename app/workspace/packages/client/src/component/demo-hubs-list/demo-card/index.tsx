import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { CaretRightOutlined, EditOutlined, ShareAltOutlined } from '@ant-design/icons';
import * as Tags from '../styled';
import DemoOptionsMenu from '../card-menu';
import { IDemoHubConfig, P_RespDemoHub, RenameDemoHubFn } from '../../../types';
import { ModalState } from '../types';
import RenameModal from '../rename-modal';
import DeleteModal from '../delete-modal';
import DemoHubShareModal from '../share-modal';
import { amplitudeDemoHubEditorOpened,
  amplitudeDemoHubPreviewOpened, amplitudeDemoHubPublished,
  amplitudeDemoHubShareModalOpened,
} from '../../../amplitude';

interface Props {
  demoHub: P_RespDemoHub;
  renameDemoHub: RenameDemoHubFn;
  deleteDemoHub: (demoHubRid: string) => void;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>;
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>;
}

function DemoCard(props : Props) : JSX.Element {
  const [editDemoModalState, setEditDemoModalState] = useState<ModalState>({
    type: 'rename',
    show: false
  });
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  return (
    <Tags.Demo key={props.demoHub.rid}>
      <div className="image-container">
        <img src={props.demoHub.thumbnailUri.href} alt="demo thumbnail" />
        <div className="option-overlay">
          <Link
            to={`/hub/${props.demoHub.rid}`}
            className="buttons edit"
            type="button"
            onClick={() => {
              amplitudeDemoHubEditorOpened({ clicked_from: 'card', demo_hub_rid: props.demoHub.rid });
            }}
          >
            <EditOutlined />&nbsp;Edit
          </Link>
          <Link
            to={`/preview/hub/${props.demoHub.rid}`}
            className="buttons preview"
            type="button"
            onClick={() => {
              amplitudeDemoHubPreviewOpened({ clicked_from: 'card', demo_hub_rid: props.demoHub.rid });
            }}
          >
            <CaretRightOutlined />&nbsp;Preview
          </Link>
        </div>
      </div>
      <div className="footer-con">
        <Tags.DisplayName className="overflow-ellipsis">{props.demoHub.displayName}</Tags.DisplayName>
        <div className="demohub-options">
          <Tags.TourMetaDataCon>Updated on {props.demoHub.displayableUpdatedAt}</Tags.TourMetaDataCon>
          <div className="btn-grp">
            <Tooltip title="Copy Embed Link" overlayStyle={{ fontSize: '0.75rem' }}>
              <Tags.EmbedBtn
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShareModalVisible(true);
                  amplitudeDemoHubShareModalOpened({ clicked_from: 'card', demo_hub_rid: props.demoHub.rid });
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
            <DemoOptionsMenu changeModalState={setEditDemoModalState} />
          </div>
        </div>
      </div>
      {
        editDemoModalState.show && editDemoModalState.type === 'rename' && (
        <RenameModal
          renameDemoHub={async (newName: string) => {
            const result = await props.renameDemoHub(props.demoHub, newName);
            return result;
          }}
          changeModalState={setEditDemoModalState}
          demoName={props.demoHub.displayName}
          modalState={editDemoModalState}
        />
        )
      }
      {
        editDemoModalState.show && editDemoModalState.type === 'delete' && (
        <DeleteModal
          deleteDemoHub={props.deleteDemoHub}
          changeModalState={setEditDemoModalState}
          demoHubRid={props.demoHub.rid}
          modalState={editDemoModalState}

        />
        )
      }
      <DemoHubShareModal
        demoHub={props.demoHub}
        isModalOpen={isShareModalVisible}
        closeModal={() => setIsShareModalVisible(false)}
        openModal={() => setIsShareModalVisible(true)}
        isPublishing={isPublishing}
        setIsPublishing={setIsPublishing}
        publishDemoHub={async (demoHub: P_RespDemoHub) => {
          const res = await props.publishDemoHub(demoHub);
          amplitudeDemoHubPublished({ clicked_from: 'card', demo_hub_rid: demoHub.rid });
          return res;
        }}
        loadDemoHubConfig={props.loadDemoHubConfig}
      />
    </Tags.Demo>
  );
}

export default DemoCard;
