// @ts-ignore
import { Provider, Config } from '@cobaltio/react-cobalt-js';
import React from 'react';
import { connect } from 'react-redux';
import {
  ApiResp,
  PlatformIntegrationType,
  RespAccountToken,
  RespCustomField,
  RespLinkedApps,
  RespOrg,
  RespPlatformIntegration,
  RespSubscription,
  RespTenantIntegration,
  RespUser
} from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { Tabs } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, LoadingOutlined, SmallDashOutlined } from '@ant-design/icons';
import { None } from 'framer-motion';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import * as Tags from './styled';
import IntegrationCard from '../../component/integrations/integration-card';
import { CBEventPayload, CBEvents, logEventToCbltToSetAppProperties } from '../../analytics/handlers';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import Webhook from './webhook';
import Button from '../../component/button';
import { amplitudeIntegrationModalOpened } from '../../amplitude';
import { FeatureForPlan } from '../../plans';
import { createMappedField, deleteMappedField, getSubscriptionOrCheckoutNew, loadMappedFields } from '../../action/creator';
import { ButtonCon } from '../../component/button/styled';
import Input from '../../component/input';

interface IDispatchProps {
  createMappedField: (newFields: string[]) => Promise<RespCustomField[]>,
  deleteMappedField: (fieldIds: string[]) => Promise<RespCustomField[]>,
  fetchMappedFields: () => Promise<RespCustomField[]>,
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>,
}

const mapDispatchToProps = (dispatch: any) => ({
  createMappedField: (newFields: string[]) => dispatch(createMappedField(newFields)),
  deleteMappedField: (fieldIds: string[]) => dispatch(deleteMappedField(fieldIds)),
  fetchMappedFields: () => dispatch(loadMappedFields()),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew())
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  org: RespOrg | null;
  featureForPlan: FeatureForPlan | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  featureForPlan: state.default.featureForPlan
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;

interface P_RespCustomField extends RespCustomField {
  dirty: boolean;
  newVal: string;
}

interface IOwnStateProps {
  cobaltSessionToken: string | null;
  listOfLinkedApps: (RespLinkedApps | RespPlatformIntegration)[];
  hasIntegrationLoadingErr: boolean;
  selectedApp: string | null;
  modalOpen: boolean;
  integrationsAvailableForPlan: string[];
  mappedFields: P_RespCustomField[] | null;
  opsInProgress: boolean;
}

const IntegrationOrder = [
  PlatformIntegrationType.Zapier,
  'slack',
  'pipedrive',
  PlatformIntegrationType.FableWebhook,
  'hubspot',
  'salesforce',
  'salesforce_pardot',
  'mailchimp',
  'outreach'
];

class Integrations extends React.PureComponent<IProps, IOwnStateProps> {
  private cobaltConfigWrapperRef: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: IProps) {
    super(props);

    this.state = {
      cobaltSessionToken: null,
      listOfLinkedApps: [],
      hasIntegrationLoadingErr: false,
      selectedApp: null,
      modalOpen: false,
      integrationsAvailableForPlan: [],
      mappedFields: null,
      opsInProgress: false
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getPlatformIntegrations = async (): Promise<RespPlatformIntegration[]> => {
    try {
      const resp = await api<any, ApiResp<RespPlatformIntegration[]>>('/tenant_integrations', {
        auth: true,
      });
      return resp.data;
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true });
      return [];
    }
  };

  getCobaltSessionToken = async (): Promise<void> => {
    try {
      const resp = await api<any, ApiResp<RespAccountToken>>('/vr/ct/tknlnkdacc', {
        auth: true,
      });
      const sessionToken = resp.data.token;
      this.setState({ cobaltSessionToken: sessionToken });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true });
    }
  };

  getListOfLinkedCobaltApps = async (): Promise<RespLinkedApps[]> => {
    try {
      const resp = await api<any, ApiResp<RespLinkedApps[]>>('/vr/ct/lstapp', {
        auth: true,
      });

      const data = resp.data
        .concat(await this.getPlatformIntegrations())
        .sort((m, n) => IntegrationOrder.indexOf(m.type) - IntegrationOrder.indexOf(n.type));
      this.setState({ listOfLinkedApps: data });
      return data;
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true,
        listOfLinkedApps: (await this.getPlatformIntegrations())
          .sort((m, n) => IntegrationOrder.indexOf(m.type) - IntegrationOrder.indexOf(n.type)) });
      return [];
    }
  };

  initiateContactPropertyEvent = async (): Promise<void> => {
    const linkedApps: RespLinkedApps[] = await this.getListOfLinkedCobaltApps();
    linkedApps.forEach(app => {
      if (!app.connected) return;

      let payload: CBEventPayload<any>;
      switch (app.type) {
        case 'hubspot':
          payload = {
            event: CBEvents.CREATE_CONTACT_PROPERTIES_AND_GROUP,
            payload: {}
          };
          logEventToCbltToSetAppProperties(payload);
          break;
        default:
          break;
      }
    });
  };

  componentDidMount(): void {
    document.title = this.props.title;

    this.getCobaltSessionToken();
    this.getListOfLinkedCobaltApps();
    if (this.props.featureForPlan) {
      this.handleIntegrationAvailable();
    }

    this.setState({
      opsInProgress: true
    });
    this.props.fetchMappedFields().then((fields) => {
      this.setState({
        opsInProgress: false,
        mappedFields: fields.map(field => ({ ...field, dirty: false, newVal: field.fieldName }))
      });
    });
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (!(this.state.selectedApp === PlatformIntegrationType.FableWebhook
      || this.state.selectedApp === PlatformIntegrationType.Zapier
    ) && this.state.selectedApp !== prevState.selectedApp) {
      let timeElapsed = 0;
      const interval = 80;
      const intervalId = setInterval((): void => {
        const buttons = this.cobaltConfigWrapperRef.current?.getElementsByTagName('button');

        if (buttons && buttons.item(buttons.length - 1)) {
          buttons.item(buttons.length - 1)?.classList.add('fable-color');
          clearInterval(intervalId);
          return;
        }

        if (timeElapsed > 5000) clearInterval(intervalId);

        timeElapsed += interval;
      }, interval);
    }

    if (this.props.featureForPlan && this.props.featureForPlan !== prevProps.featureForPlan) {
      this.handleIntegrationAvailable();
    }
  }

  handleIntegrationAvailable(): void {
    const integrationFeature = this.props.featureForPlan!.integration;
    if (integrationFeature) {
      const integrationsAvailable = integrationFeature.value as string[];
      this.setState({ integrationsAvailableForPlan: integrationsAvailable });
    }
  }

  getIntegrationConfig(selectedApp: PlatformIntegrationType) {
    if (selectedApp === PlatformIntegrationType.FableWebhook) {
      return (
        <Webhook
          config={this.state.listOfLinkedApps.find(f => f.type === selectedApp) as RespPlatformIntegration | undefined}
          deleteWebhook={(id: number) => {
            this.setState(state => {
              const webhookApp = state.listOfLinkedApps
                .findIndex(app => app.type === PlatformIntegrationType.FableWebhook);

              const tis = (state.listOfLinkedApps[webhookApp] as RespPlatformIntegration)
                .tenantIntegrations.filter(ti => ti.id !== id);

              (state.listOfLinkedApps[webhookApp] as RespPlatformIntegration) = {
                ...((state.listOfLinkedApps[webhookApp]) as RespPlatformIntegration),
                tenantIntegrations: tis
              };

              return ({ listOfLinkedApps: state.listOfLinkedApps.slice(0) });
            });
          }}
          createNewPlaceholderWebhook={(localId) => {
            const idx = this.state.listOfLinkedApps.findIndex(f => f.type === this.state.selectedApp);
            const app = this.state.listOfLinkedApps[idx] as RespPlatformIntegration;
            const webhooks = app.tenantIntegrations.concat({
              relay: localId,
            } as RespTenantIntegration);
            this.setState(state => ({
              ...state,
              listOfLinkedApps: state.listOfLinkedApps.slice(0, idx).concat({
                ...app,
                tenantIntegrations: webhooks
              }, ...state.listOfLinkedApps.slice(idx + 1))
            }));
          }}
        />
      );
    } if (selectedApp === PlatformIntegrationType.Zapier) {
      return (
        <div>
          <div className="typ-h1">Connect 6000+ apps to Fable via Zapier</div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '2rem',
          }}
          >
            <Button
              style={{
                background: '#ff5c1a',
              }}
              onClick={() => {
                window.open('https://zapier.com/developer/public-invite/203718/7fb7052ae2d580fa46cebae57027d92d/', '_blank');
              }}
            >
              Connect to Zapier
            </Button>
            <Button
              intent="secondary"
              onClick={() => {
                window.open('https://help.sharefable.com/Integrations/Zapier', '_blank');
              }}
            >
              Read how to connect to Zapier
            </Button>
          </div>
        </div>
      );
    }
    return <></>;
  }

  // eslint-disable-next-line class-methods-use-this
  isOurIntegration(selectedApp: string | undefined) {
    if (!selectedApp) false;
    return selectedApp!.startsWith('Fable') || selectedApp!.startsWith('Zapier');
  }

  convertCustomFieldsToLabel() {
    return this.state.mappedFields!.map((field) => ({
      name: field.newVal,
      value: field.newVal
    }));
  }

  render(): JSX.Element {
    return (
      <GTags.ColCon>
        {this.props.loadingState === 'loading' && <TopLoader
          duration={TOP_LOADER_DURATION}
          showLogo={false}
          showOverlay
        />}
        <div style={{ height: '48px' }}>
          <Header
            subs={this.props.subs}
            org={this.props.org}
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel
              selected="integrations"
              subs={this.props.subs}
              compact={this.props.searchParams.get('c') === '1'}
            />
          </GTags.SidePanelCon>
          <GTags.MainCon style={{ overflow: 'auto', paddingLeft: '3%', paddingTop: '2rem' }}>
            <Tabs defaultActiveKey="1">
              <Tabs.TabPane tab="Integration" key="1">
                <Tags.IntegrationCardCon style={{ paddingLeft: '0%' }}>
                  <div className="typ-reg">
                    All your available integrations are displayed here.
                    <br />
                    Need an integration we don't have?
                    <GTags.OurLink
                      style={{
                        display: 'inline-block',
                        marginLeft: '0.5rem'
                      }}
                      className="support-bot-open"
                    >
                      Contact us
                    </GTags.OurLink>.
                  </div>
                  {this.state.hasIntegrationLoadingErr && (
                  <div className="err-msg">
                    <h3>Couldn't load some integrations</h3>
                    <p>
                      This might happen when you don't have access to integrations.
                    </p>
                    <p>
                      Please contact us using the in app chat or email us at&nbsp;
                      <a href="mailto:support@sharefable.com?subject=Can't access integrations">
                        support@sharefable.com
                      </a>.
                    </p>
                  </div>
                  )}
                  {this.state.listOfLinkedApps.map(appConfig => {
                    const enableIntegration = this.state.integrationsAvailableForPlan.includes(appConfig.slug)
                 || this.state.integrationsAvailableForPlan.includes('*');
                    return <IntegrationCard
                      key={appConfig.slug}
                      appConfig={appConfig}
                      subs={this.props.subs}
                      onClick={() => {
                        if (enableIntegration) {
                          this.setState({ selectedApp: appConfig.slug, modalOpen: true });
                          amplitudeIntegrationModalOpened(appConfig.name);
                        }
                      }}
                      disable={!enableIntegration}
                    />;
                  })}
                </Tags.IntegrationCardCon>
              </Tabs.TabPane>
              <Tabs.TabPane tab="Custom Field Mapping" key="2">
                <div className="typ-reg">
                  You can map a custom field that you've created in your lead form to a field in your integration.
                  <br />
                  Fable by default map standard fields from your lead form to the relevant fields in your integration.
                </div>
                <Tags.CustomFieldCon className={`typ-reg ${this.state.opsInProgress ? 'disabled' : ''}`}>
                  <div>
                    {this.state.mappedFields ? (
                      <div className="fields-con">
                        {this.state.mappedFields.map((field, i) => (
                          <div key={i}>
                            <Input
                              placeholder=""
                              defaultValue={field.newVal}
                              onChange={(e) => {
                                this.setState(state => {
                                  const newVal = {
                                    ...state.mappedFields![i],
                                    newVal: e.target.value.trim(),
                                    dirty: e.target.value.trim() !== field.fieldName
                                  };
                                  return { mappedFields: state.mappedFields!.slice(0, i).concat(newVal, ...state.mappedFields!.slice(i + 1)) };
                                });
                              }}
                              label="Field name"
                              sz="medium"
                              containerStyle={{
                                flex: '1 0 auto'
                              }}
                            />
                            <div>
                              {field.dirty && (
                              <GTags.OurLink onClick={async () => {
                                this.setState({ opsInProgress: true });
                                if (!field.fieldName) {
                                  // create a new field
                                  await this.props.createMappedField([field.newVal]);
                                } else {
                                  // update an existing field by deleting it and then creating a new one
                                  await this.props.createMappedField([field.newVal]);
                                  await this.props.deleteMappedField([field.fieldName]);
                                }
                                this.setState(state => {
                                  const newVal: P_RespCustomField = {
                                    fieldName: field.newVal,
                                    newVal: field.newVal,
                                    dirty: false
                                  };
                                  return {
                                    opsInProgress: false,
                                    mappedFields: state.mappedFields!.slice(0, i).concat(newVal, ...state.mappedFields!.slice(i + 1))
                                  };
                                });
                              }}
                              >
                                <CheckCircleOutlined />
                              </GTags.OurLink>
                              )}
                              <GTags.OurLink onClick={async () => {
                                this.setState({ opsInProgress: true });
                                await this.props.deleteMappedField([field.fieldName]);
                                this.setState(state => ({
                                  opsInProgress: false,
                                  mappedFields: state.mappedFields!.filter((fields) => fields.newVal !== field.fieldName)
                                }));
                              }}
                              >
                                <DeleteOutlined />
                              </GTags.OurLink>
                            </div>
                          </div>
                        ))}
                        {this.state.mappedFields.length === 0 && (
                        <p>
                          You don't have any mapped fields.
                        </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <LoadingOutlined /> Loading mapped fields...
                      </div>
                    )}
                    <div className="btn-con">
                      <Button
                        intent="secondary"
                        onClick={() => {
                          this.setState(state => (
                            { mappedFields: [...(state.mappedFields || []), { fieldName: '', dirty: true, newVal: 'field_name' }] }
                          ));
                        }}
                      >
                        Add a new mapping
                      </Button>
                      {this.state.opsInProgress && (
                      <div>
                        <LoadingOutlined />
                      </div>
                      )}
                    </div>
                  </div>
                  <div className="docs">
                    <div>Mapped fields</div>
                    <p className="typ-sm">
                      These fields are by default mapped to respective integration fields.
                    </p>
                    <ul className="typ-ip">
                      <li>email</li>
                      <li>first_name</li>
                      <li>last_name</li>
                      <li>phone</li>
                      <li>company</li>
                      <li>industry</li>
                      <li>country</li>
                      <li>website_url</li>
                    </ul>
                  </div>
                </Tags.CustomFieldCon>
              </Tabs.TabPane>
            </Tabs>
            <GTags.BorderedModal
              open={this.state.modalOpen}
              onCancel={() => this.setState({ selectedApp: null, modalOpen: false })}
              footer={null}
              width={this.state.selectedApp && this.isOurIntegration(this.state.selectedApp) ? 750 : undefined}
              centered
              afterOpenChange={(open) => {
                // TODO: this has been written in a hurry
                // ideally, the better approach is to use redux state
                if (open
                  && this.state.selectedApp
                  && this.state.selectedApp.startsWith('Fable')
                  && this.state.selectedApp === PlatformIntegrationType.FableWebhook
                ) {
                  this.getListOfLinkedCobaltApps();
                }
              }}
            >
              {this.state.selectedApp && (
                (this.isOurIntegration(this.state.selectedApp)) ? (
                  this.getIntegrationConfig(this.state.selectedApp as PlatformIntegrationType)
                ) : (
                  <Tags.CobaltConfigWrapper ref={this.cobaltConfigWrapperRef}>
                    <Provider
                      sessionToken={this.state.cobaltSessionToken}
                    >
                      <Config
                        removeBranding
                        slug={this.state.selectedApp}
                        onSave={() => this.setState({ modalOpen: false })}
                        onConnect={this.initiateContactPropertyEvent}
                        labels={{ 'contact map': this.convertCustomFieldsToLabel() }}
                      />
                    </Provider>
                  </Tags.CobaltConfigWrapper>
                )
              )}
            </GTags.BorderedModal>
          </GTags.MainCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Integrations));
