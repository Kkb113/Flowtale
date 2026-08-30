import React, { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { IDemoHubConfig, P_RespDemoHub, RenameDemoHubFn } from '../../types';
import * as Tags from './styled';
import DemoCard from './demo-card';
import Button from '../button';
import * as GTags from '../../common-styled';
import Input from '../input';
import { FeatureForPlan } from '../../plans';
import { isFeatureAvailable } from '../../utils';
import DemohubIllustration from '../../assets/illustration-3.svg';
import { sendAmplitudeDemoHubDataEvent } from '../../amplitude';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  demoHubsList: P_RespDemoHub[];
  createNewDemoHub: (name: string) => Promise<P_RespDemoHub>;
  renameDemoHub: RenameDemoHubFn;
  deleteDemoHub: (demoHubRid: string) => void;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>,
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>,
  navigateToDemoHub: (demoHubRid: string) => void
  featurePlan: FeatureForPlan | null;
}

function DemoHubsList(props: Props): JSX.Element {
  const [showModal, setShowModal] = useState(false);
  const [newDemoHubName, setNewDemoHubName] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const available = isFeatureAvailable(props.featurePlan, 'demo_hub');
    setIsAvailable(available.isAvailable && !available.isInBeta && !available.requireAccess);
  }, [props.featurePlan]);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreateDemoHub() : Promise<void> {
    if (newDemoHubName === '') {
      setErrorMsg('Demo hub name needs to be a valid name');
      return;
    }
    if (newDemoHubName.length > 200) {
      setErrorMsg(
        'Demo hub name needs to be a valid name. A valid name would contain more than 1 char and less than 200 char'
      );
      return;
    }
    setCreating(true);
    setErrorMsg(null);
    const res = await props.createNewDemoHub(newDemoHubName);
    sendAmplitudeDemoHubDataEvent({
      type: AMPLITUDE_EVENTS.CREATE_NEW_DEMO_HUB,
      payload: { value: newDemoHubName }
    });
    props.navigateToDemoHub(res.rid);
    setCreating(false);
    setShowModal(false);
    setNewDemoHubName('');
  }
  return (
    <Tags.DemoHubContainer>
      <Tags.TopPanel style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      >
        {isAvailable && (<Tags.ToursHeading style={{ fontWeight: 400 }}>All demo hubs in your org</Tags.ToursHeading>)}
        <Button
          icon={isAvailable && <PlusOutlined />}
          iconPlacement="left"
          className={`typ-btn ${isAvailable ? '' : 'support-bot-open'}`}
          onClick={() => { isAvailable && setShowModal(true); }}
          intent="primary"
        >
          {isAvailable ? 'Create a demo hub' : 'Request Access for Demo Hub'}
        </Button>
      </Tags.TopPanel>
      {props.demoHubsList.length ? (
        <Tags.DemoGrid>
          {props.demoHubsList.map((demoHub, index) => (
            <DemoCard
              key={demoHub.id}
              demoHub={demoHub}
              renameDemoHub={props.renameDemoHub}
              deleteDemoHub={props.deleteDemoHub}
              publishDemoHub={props.publishDemoHub}
              loadDemoHubConfig={props.loadDemoHubConfig}
            />
          ))}
        </Tags.DemoGrid>
      ) : (
        <Tags.EmptyState>
          <img src={DemohubIllustration} style={{ height: '240px' }} alt="demohub illustration" />
          <p className="typ-reg">
            Demo Hub is a paid add-on for interactive demos. It helps you organize, personalize, and share your interactive demos effortlessly.
          </p>
          <ul className="typ-reg">
            <li>Store and manage all demos in one hub, making it easy to access and share.</li>
            <li>Create customized demo journeys for prospects, tailored to specific use cases/ personas/ customer segments.</li>
            <li>Share demos with simple links and collaborate across teams for smooth sales, marketing, and support processes.</li>
          </ul>
        </Tags.EmptyState>
      )}
      <GTags.BorderedModal
        className="demo-hub-bordered-modal"
        open={showModal}
        onCancel={() => {
          setShowModal(false);
          setNewDemoHubName('');
          setErrorMsg(null);
        }}
        footer={(
          <div className="button-two-col-cont">
            <Button
              type="button"
              intent="secondary"
              onClick={
                () => {
                  setShowModal(false);
                  setNewDemoHubName('');
                  setErrorMsg(null);
                }
              }
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              style={{ flex: 1 }}
              onClick={
                () => {
                  handleCreateDemoHub();
                }
              }
              disabled={creating}
            >
              {creating ? 'Saving' : 'Save'}
            </Button>
          </div>
        )}
      >
        <Tags.ModalContainer>
          <div className="modal-title">Create a new demo hub</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateDemoHub();
            }}
            style={{ paddingTop: '1rem', gap: '1rem', flexDirection: 'column', display: 'flex' }}
          >
            <Input
              label="New demo hub name"
              value={newDemoHubName}
              onChange={(e) => setNewDemoHubName(e.target.value)}
              type="text"
            />
          </form>
          {errorMsg && <Tags.ErrorMsg className="error-msg">{errorMsg}</Tags.ErrorMsg>}
        </Tags.ModalContainer>
      </GTags.BorderedModal>
    </Tags.DemoHubContainer>
  );
}

export default DemoHubsList;
