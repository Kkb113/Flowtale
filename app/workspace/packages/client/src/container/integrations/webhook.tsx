import { RespPlatformIntegration } from '@fable/common/dist/api-contract';
import React from 'react';
import { ToTopOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import Button from '../../component/button';
import WebhookForm from '../../component/integrations/webhook-form';

interface IProps {
  deleteWebhook: (id: number) => void;
  config?: RespPlatformIntegration
  createNewPlaceholderWebhook: (localId: number) => void
}

interface PlatformConfig {
  cv: number;
  v: Array<{
    v: number;
    config: {
      events: string[]
    }
  }>
}

interface IState {
}

export default class Webhook extends React.PureComponent<IProps, IState> {
  getSupportedEvents = (): string[] => {
    if (!this.props.config) return [];
    const platformConfig = this.props.config.platformConfig as PlatformConfig;
    const supportedEvents = platformConfig.v[platformConfig.cv].config.events;

    return supportedEvents;
  };

  render(): JSX.Element {
    if (!this.props.config) return <></>;

    const supportedEvents = this.getSupportedEvents();

    return (
      <Tags.WebhookConfCon>
        <div className="header-con">
          <img src={this.props.config.icon} alt={this.props.config.name} />
          <div className="header-txt">
            <h3>{this.props.config.name}</h3>
            <p>{this.props.config.description}</p>
          </div>
        </div>
        <div className="body-con">
          {this.props.config.tenantIntegrations.map(webhook => (
            <WebhookForm
              deleteWebhook={this.props.deleteWebhook}
              key={webhook.relay}
              webhook={webhook}
              supportedEvents={supportedEvents}
            />
          ))}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <Button
              icon={<ToTopOutlined />}
              iconPlacement="left"
              intent={this.props.config.tenantIntegrations.length > 0 ? 'secondary' : 'primary'}
              onClick={() => {
                this.props.createNewPlaceholderWebhook(+new Date());
              }}
            >
              Create a new webhook
            </Button>
          </div>
        </div>
      </Tags.WebhookConfCon>
    );
  }
}
