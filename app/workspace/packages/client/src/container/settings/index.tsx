/* eslint-disable no-tabs */
import React from 'react';
import { connect } from 'react-redux';
import api from '@fable/common/dist/api';
import { ApiResp, RespApiKey, RespVanityDomain, VanityDomainDeploymentStatus } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { CheckCircleFilled, CodeOutlined, CopyOutlined, FormatPainterOutlined, GlobalOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { timeFormat } from 'd3-time-format';
import { Modal, Tabs, Tag } from 'antd';
import { CmnEvtProp } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import GlobalConfigEditor from '../global-config-editor';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import SidePanel from '../../component/side-panel';
import { TOP_LOADER_DURATION } from '../../constants';
import Header from '../../component/header';
import TopLoader from '../../component/loader/top-loader';
import Button from '../../component/button';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { addNewCustomDomain, getCustomDomains, removeCustomDomain, pollForDomainUpdate, getSubscriptionOrCheckoutNew } from '../../action/creator';
import Input from '../../component/input';
import { isFeatureAvailable } from '../../utils';
import Upgrade from '../../component/upgrade';

const { confirm } = Modal;

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

const mapDispatchToProps = (dispatch: any) => ({
  getVanityDomains: () => dispatch(getCustomDomains()),
  addNewCustomDomain: (domainName: string, subdomainName: string, apexDomainName: string) => dispatch(addNewCustomDomain(domainName, subdomainName, apexDomainName)),
  removeCustomDomain: (domainName: string, subdomainName: string, apexDomainName: string) => dispatch(removeCustomDomain(domainName, subdomainName, apexDomainName)),
  pollForDomainUpdate: (domain: RespVanityDomain) => dispatch(pollForDomainUpdate(domain)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew())
});

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  featureForPlan: state.default.featureForPlan,
  vanityDomains: state.default.vanityDomains,
  featurePlan: state.default.featureForPlan,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps {
  apiKey: RespApiKey | null;
  copyMsg: string;
  timer: ReturnType<typeof setTimeout> | null;
  opsInProgress: boolean;
  isLoading: boolean;
  allowedCustomDomain: number;
  showError: string;
  rootDomainName: string;
  subdomainName: string;
  isCustomDomainAvailable: boolean;
}

class Settings extends React.PureComponent<IProps, IOwnStateProps> {
  private timers: Array<ReturnType<typeof setTimeout> | null> = [];

  constructor(props: IProps) {
    super(props);

    this.state = {
      apiKey: null,
      copyMsg: 'Click to copy to clipboard',
      timer: null,
      opsInProgress: false,
      isLoading: true,
      allowedCustomDomain: -1,
      showError: '',
      rootDomainName: '',
      subdomainName: '',
      isCustomDomainAvailable: true,
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;
    this.getActiveApiKey();
    this.setState({ allowedCustomDomain: this.getNoOfCustomDomain() });
    this.props.getVanityDomains();
    this.pollForPendingCerts();
    if (this.props.featurePlan) this.checkIfCustomDomainFeatureAvailable();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.featureForPlan !== prevProps.featureForPlan && this.props.featureForPlan) {
      this.setState({ allowedCustomDomain: this.getNoOfCustomDomain() });
    }

    if (this.props.vanityDomains !== prevProps.vanityDomains && this.props.vanityDomains) {
      this.pollForPendingCerts();
    }

    if (this.props.featurePlan !== prevProps.featurePlan) {
      this.checkIfCustomDomainFeatureAvailable();
    }
  }

  checkIfCustomDomainFeatureAvailable(): void {
    const isAvailable = isFeatureAvailable(this.props.featurePlan, 'custom_domain').isAvailable;
    this.setState({ isCustomDomainAvailable: isAvailable });
  }

  pollForPendingCerts() {
    this.timers.forEach(id => id && clearTimeout(id));
    if (!this.props.vanityDomains) return;

    this.props.vanityDomains.forEach(vanityDomain => {
      if (vanityDomain.status === VanityDomainDeploymentStatus.DeploymentPending) {
        setTimeout(() => {
          this.props.pollForDomainUpdate(vanityDomain);
        }, 3000);
      }
    });

    this.timers.push(...this.props.vanityDomains.map(vanityDomain => {
      if (vanityDomain.status === VanityDomainDeploymentStatus.InProgress) {
        return setInterval(() => {
          this.props.pollForDomainUpdate(vanityDomain);
        }, 5000);
      } if (vanityDomain.status === VanityDomainDeploymentStatus.VerificationPending) {
        return setInterval(() => {
          this.props.pollForDomainUpdate(vanityDomain);
        }, 15000);
      }

      return null;
    }));
  }

  componentWillUnmount() {
    this.timers.forEach(id => id && clearTimeout(id));
  }

  async getActiveApiKey(): Promise<void> {
    try {
      const resp = await api<any, ApiResp<RespApiKey | null>>('/apikey', {
        auth: true,
      });
      this.setState({ apiKey: resp.data, isLoading: false });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ apiKey: null });
    }
  }

  async genApiKey(): Promise<void> {
    try {
      const resp = await api<any, ApiResp<RespApiKey | null>>('/new/apikey', {
        auth: true,
        method: 'POST'
      });
      this.setState({ apiKey: resp.data });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ apiKey: null });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getIconBasedOnDomainStatus(status: VanityDomainDeploymentStatus) {
    switch (status) {
      case VanityDomainDeploymentStatus.InProgress:
      case VanityDomainDeploymentStatus.VerificationPending:
        return <LoadingOutlined style={{}} />;
      case VanityDomainDeploymentStatus.Issued:
        return <CheckCircleFilled style={{
          color: '#7567ff'
        }}
        />;
      default:
        return null;
    }
  }

  getNoOfCustomDomain(): number {
    if (!this.props.featureForPlan) return -1;
    try {
      const numberOfCustomDomainAllowed = this.props.featureForPlan.domain_for_sharing.value as string;
      const limitStr = numberOfCustomDomainAllowed.match(/<=(\d+)/);
      if (limitStr && limitStr[1]) {
        const limit = +limitStr[1];
        return Number.isFinite(limit) ? limit : -1;
      }
      return -1;
    } catch (e) {
      raiseDeferredError(e as Error);
      return -1;
    }
  }

  showErrorMsg = (msg: string, cancelAfterMs = 7000) => {
    this.setState({
      showError: msg
    });
    setTimeout(() => {
      this.setState({
        showError: ''
      });
    }, cancelAfterMs);
  };

  render() {
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
            tour={null}
            org={this.props.org}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon flat={this.props.searchParams.get('c') === '1'}>
            <SidePanel
              selected="settings"
              subs={this.props.subs}
              compact={this.props.searchParams.get('c') === '1'}
            />
          </GTags.SidePanelCon>
          <GTags.MainCon style={{ overflow: 'auto', paddingLeft: '3%' }}>
            <Tags.Con>
              <Tabs
                // defaultActiveKey="developer"
                defaultActiveKey="global-style"
                items={[{
                  key: 'global-style',
                  label: (
                    <>
                      <FormatPainterOutlined /> Global Style
                    </>
                  ),
                  children: (
                    <GlobalConfigEditor />
                  )
                },
                {
                  key: 'developer',
                  label: (
                    <>
                      <CodeOutlined />Developer
                    </>
                  ),
                  children: (
                    <div>
                      <p className="typ-reg">
                        API Keys are unique to a workspace. You can use API Key here to connect to third party system like Zapier etc.
                      </p>
                      <p className="typ-reg">
                        API Keys are critical, make sure the key is not leaked. You can always generate a new key in case you think a previous key has been compromised.
                      </p>
                      {
                        this.state.isLoading && (
                          <p className="typ-reg">
                            <LoadingOutlined style={{ marginRight: '0.5rem' }} />
                            Loading...
                          </p>
                        )
                      }
                      {
                        !this.state.isLoading && (
                          <>
                            {this.state.apiKey ? (
                              <Tags.ApiKeyDetails>
                                <Tags.ApiKeyTxt
                                  className="typ-btn"
                                  copyMsg={this.state.copyMsg}
                                  onMouseUp={() => {
                                    navigator.clipboard.writeText(this.state.apiKey!.apiKey);
                                    if (this.state.timer) clearTimeout(this.state.timer);
                                    const timer = setTimeout(() => {
                                      this.setState({
                                        copyMsg: 'Click to copy to clipboard'
                                      });
                                    }, 5000);
                                    this.setState({
                                      copyMsg: 'Copied to clipboard',
                                      timer,
                                    });
                                  }}
                                >
                                  {this.state.apiKey.apiKey}
                                </Tags.ApiKeyTxt>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                >
                                  Created by
                                  <img className="avatar" alt="avatar" src={this.state.apiKey.createdBy.avatar} />
                                  {this.state.apiKey.createdBy.firstName} {this.state.apiKey.createdBy.lastName}
                                  &nbsp;
                                  on {dateTimeFormat(new Date(this.state.apiKey.createdAt))}
                                </div>
                                <div style={{
                                  marginTop: '0.5rem'
                                }}
                                >
                                  <Button
                                    intent="secondary"
                                    size="small"
                                    onClick={() => confirm({
                                      title: 'Are you sure you want to generate a new API Key?',
                                      content: `
                          If you generate a new API key, the current key will cease to exist.
                          If you've used this key in integrations, you have to manually update the API Key
                        `,
                                      okText: this.state.opsInProgress ? 'Generating...' : 'Generate New API Key',
                                      onOk: async () => {
                                        traceEvent(
                                          AMPLITUDE_EVENTS.API_KEY_GENERATED,
                                          {
                                            regenerated: true
                                          },
                                          [CmnEvtProp.EMAIL]
                                        );
                                        this.setState({ opsInProgress: true });
                                        await this.genApiKey();
                                        this.setState({ opsInProgress: false });
                                      },
                                      onCancel() {}
                                    })}
                                  >Create a New API Key
                                  </Button>
                                </div>
                              </Tags.ApiKeyDetails>
                            ) : (
                              <Button
                                intent="primary"
                                disabled={this.state.opsInProgress}
                                icon={this.state.opsInProgress ? <LoadingOutlined /> : <PlusOutlined />}
                                iconPlacement="left"
                                onClick={async () => {
                                  this.setState({ opsInProgress: true });
                                  await this.genApiKey();
                                  this.setState({ opsInProgress: false });
                                }}
                              >
                                Create a New API Key
                              </Button>
                            )}
                          </>
                        )
                      }
                    </div>
                  ),
                }, {
                  key: 'customdomain',
                  label: (
                    <>
                      <GlobalOutlined />Custom domain
                    </>
                  ),
                  children: (
                    <div className="typ-reg">
                      <div>
                        {this.state.allowedCustomDomain >= 1 && (
                          <p>
                            You can add max {this.state.allowedCustomDomain} custom domains in this plan.&nbsp;
                            <GTags.OurLink
                              href="/billing"
                              style={{
                                display: 'inline'
                              }}
                            >Upgrade plan to increase limit.
                            </GTags.OurLink>
                          </p>
                        )}
                      </div>
                      {this.props.vanityDomains === null ? (
                        <div><LoadingOutlined /> Loading...</div>
                      ) : (
                        <div>
                          <div style={{
                            margin: (this.props.vanityDomains || []).length ? '2rem 0' : undefined
                          }}
                          >
                            {this.props.vanityDomains.map((domain, i) => (
                              <Tags.CustomDomainCard key={i}>
                                <div className="l1">
                                  <div className="prim">
                                    {domain.domainName}
                                  </div>
                                  <div>
                                    <span>
                                      {this.getIconBasedOnDomainStatus(domain.status)} &nbsp;
                                      {domain.status === VanityDomainDeploymentStatus.Issued ? 'Available' : domain.status}
                                    </span>
                                    &nbsp; | &nbsp;
                                    <span className="typ-sm">
                                      <Tags.ABtn onClick={() => {
                                        confirm({
                                          title: 'Confirm your action',
                                          content: (
                                            <div className="typ-reg">
                                              Are you sure you wanna remove&nbsp;
                                              <span style={{
                                                fontFamily: '"IBM Plex Mono", monospace !important',
                                                fontWeight: 600
                                              }}
                                              >{domain.domainName}
                                              </span>&nbsp;
                                              domain?
                                            </div>
                                          ),
                                          okType: 'danger',
                                          okText: 'Delete this domain',
                                          onOk: async () => {
                                            await this.props.removeCustomDomain(domain.domainName, domain.subdomainName, domain.apexDomainName);
                                          },
                                          onCancel() {}
                                        });
                                      }}
                                      >Remove
                                      </Tags.ABtn>
                                    </span>
                                  </div>
                                </div>
                                <div className="l2 typ-sm">
                                  Created {domain.displayableCreatedAt}
                                </div>
                                <div className="typ-sm l3">
                                  {(domain.status === VanityDomainDeploymentStatus.Requested) && (
                                    <>
                                      <div style={{
                                        background: '#616161',
                                        fontWeight: 500,
                                        color: 'white',
                                        lineHeight: '1.2rem',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        textAlign: 'left'
                                      }}
                                      >
                                        Generating the CNAME records might take ~ 2mins.
                                        Once the CNAME is generated you MUST add the records in your domain provider console within 30mins.
                                        Otherwise verification may fail and the created CNAME would be deleted.
                                        <br />
                                        <br />
                                        Click the button below to generate CNAME records
                                      </div>
                                      <Button
                                        size="medium"
                                        intent="secondary"
                                        style={{
                                          background: '#fff'
                                        }}
                                        onClick={async () => {
                                          confirm({
                                            title: 'Do you want to generate CNAME record right now?',
                                            content: `
                                              Generating the CNAME records might take ~ 2mins.
                                              Once the CNAME is generated you MUST add the records in your domain provider console within 30mins.
                                              Otherwise verification may fail and the created CNAME would be deleted.
                                            `,
                                            okText: 'Generate CNAME records',
                                            onOk: async () => {
                                              await this.props.removeCustomDomain(domain.domainName, domain.subdomainName, domain.apexDomainName);
                                              await this.props.addNewCustomDomain(domain.domainName, domain.subdomainName, domain.apexDomainName);
                                            },
                                            onCancel() {}
                                          });
                                        }}
                                      >Generate CNAME Records
                                      </Button>
                                    </>
                                  )}
                                  {(domain.status === VanityDomainDeploymentStatus.InProgress && (
                                    <div style={{
                                      background: '#ff7450',
                                      fontWeight: 500,
                                      color: 'white',
                                      lineHeight: '1.2rem',
                                      padding: '4px 8px',
                                      borderRadius: '8px',
                                      textAlign: 'left'
                                    }}
                                    >
                                      Generating the CNAME records might take ~ 2mins.
                                      You MUST add the following records in your domain provider console within 30mins.
                                      Otherwise verification may fail and the created CNAME would be deleted.
                                      <br />
                                      <br />
                                      Generated CNAME records will be shown below once those are generated.
                                    </div>
                                  ))}
                                  {(domain.status === VanityDomainDeploymentStatus.Failed && domain.rejectionReason === 'CAA_INVALID') && (
                                    <div
                                      style={{
                                        width: '100%'
                                      }}
                                      className="typ-reg"
                                    >
                                      <p>
                                        Your custom domain request got rejected because:&nbsp;
                                        <span style={{
                                          color: '#ff7450',
                                          fontWeight: '500',
                                        }}
                                        >
                                          At least one of your domains has a CAA record that does not include Amazon as an approved Certificate Authority.
                                        </span>
                                      </p>
                                      <p>
                                        Perform the following steps inside your domain provider's console to fix this issue.
                                      </p>
                                      <ol>
                                        <li>Delete <span className="prim">CNAME</span> record associated with <span className="prim">{domain.domainName}</span> key (if any)</li>
                                        <li>
                                          Add all the following DNS record sets
                                          <pre className="prim blok">
                                            {['amazonaws.com', 'awstrust.com', 'amazontrust.com', 'amazon.com'].map(ca => `
                                              ${domain.apexDomainName}	CAA	0 issue "${ca}"\n${domain.apexDomainName}	CAA	0 issuewild "${ca}"
                                            `.trim()).concat(`${domain.domainName} CAA 0 issue ";"`).join('\n')}
                                          </pre>
                                        </li>
                                        <li>Delete this custom domain request by clicking on Remove on top right corner of this card</li>
                                        <li>
                                          Wait for 30 mins to propagate the DNS.&nbsp;
                                          <GTags.OurLink
                                            style={{ display: 'inline' }}
                                            href={`https://www.whatsmydns.net/#CAA/${domain.apexDomainName}`}
                                            target="_blank"
                                          >
                                            You can roughly check your DNS propagation status here.
                                          </GTags.OurLink>
                                        </li>
                                        <li>Make a new request for custom domain</li>
                                      </ol>
                                      <p>
                                        <GTags.OurLink
                                          href="https://sharefable.notion.site/To-do-when-custom-domain-creation-fails-7cd688bccf4740e8849f081932e371ed?pvs=4"
                                          target="_blank"
                                        >Read more about why this is required
                                        </GTags.OurLink>
                                      </p>
                                    </div>
                                  )}
                                  {(domain.status === VanityDomainDeploymentStatus.Issued
                                    || domain.status === VanityDomainDeploymentStatus.VerificationPending
                                    || domain.status === VanityDomainDeploymentStatus.DeploymentPending) && (
                                      <>
                                        {domain.status === VanityDomainDeploymentStatus.VerificationPending && (
                                          <div style={{
                                            background: '#ff7450',
                                            fontWeight: 500,
                                            color: 'white',
                                            lineHeight: '1.2rem',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            textAlign: 'left'
                                          }}
                                          >
                                            You MUST add the following records in your domain provider console within 30mins.
                                            Otherwise verification may fail and the created CNAME would be deleted.
                                            Verification might take few mins.
                                          </div>
                                        )}
                                        {domain.status === VanityDomainDeploymentStatus.DeploymentPending && (
                                          <p className="typ-reg">
                                            You are all set! It might take couple of hours to propagate your custom domain to all our edge locations.
                                          </p>
                                        )}
                                        <div style={{
                                          flex: '1 0 auto'
                                        }}
                                        >
                                          <Tags.AntCollapse
                                            size="small"
                                            defaultActiveKey={1}
                                            items={[{
                                              key: '1',
                                              label: 'Copy record set',
                                              children: (
                                                <Tags.RecordCon>
                                                  <table>
                                                    {domain.records.map((record, ii) => (
                                                      <tbody key={ii}>
                                                        <tr>
                                                          <td colSpan={2} className="th">{record.recordDes}</td>
                                                        </tr>
                                                        <tr>
                                                          <td>Record type</td>
                                                          <td>{record.recordType}</td>
                                                        </tr>
                                                        <tr>
                                                          <td>Record name</td>
                                                          <td>
                                                            <CopyOutlined
                                                              className="cpy"
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(record.recordKey);
                                                              }}
                                                            />&nbsp;
                                                            <span className="foc">
                                                              {record.recordKey}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                        <tr>
                                                          <td>Value</td>
                                                          <td>
                                                            <CopyOutlined
                                                              className="cpy"
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(record.recordValue);
                                                              }}
                                                            />&nbsp;
                                                            <span className="foc">
                                                              {record.recordValue}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      </tbody>
                                                    ))}
                                                  </table>
                                                </Tags.RecordCon>
                                              )
                                            }]}
                                          />
                                        </div>
                                      </>
                                  )}
                                </div>
                              </Tags.CustomDomainCard>
                            ))}
                          </div>
                          {(this.props.vanityDomains || []).length === 0 && (
                            <div style={{
                              lineHeight: '1.2rem',
                              textAlign: 'left',
                              marginBottom: '1rem'
                            }}
                            >
                              Generating the CNAME records might take ~ 2mins.
                              Once the CNAME is generated you MUST add the records in your domain provider console within 30mins.
                              Otherwise verification may fail and the created CNAME would be deleted.
                            </div>
                          )}
                          { this.state.isCustomDomainAvailable
                            ? (
                              <Button
                                icon={<PlusOutlined />}
                                iconPlacement="left"
                                intent="secondary"
                                size="medium"
                                onClick={() => {
                                  if (this.state.allowedCustomDomain !== -1 && this.state.allowedCustomDomain <= this.props.vanityDomains!.length) {
                                    this.showErrorMsg("You've reached the limit for custom domain in your plan. Please upgrade.");
                                    return;
                                  }
                                  confirm({
                                    title: 'Please enter the following details',
                                    content: (
                                      <div>
                                        <br />
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'end'
                                        }}
                                        >
                                          <Input
                                            label="Subdomain (demo)"
                                            onChange={(e) => this.setState({ subdomainName: e.target.value })}
                                            containerStyle={{
                                              flex: '3'
                                            }}
                                            required
                                            autoFocus
                                          />
                                      &nbsp;<span style={{
                                            background: '#424242',
                                            height: '6px',
                                            width: '6px',
                                            borderRadius: '6px',
                                            marginBottom: '6px',
                                            marginLeft: '3px',
                                            marginRight: '3px'
                                          }}
                                      />&nbsp;
                                          <Input
                                            label="Apex domain (acme.com)"
                                            containerStyle={{
                                              flex: '1 0 auto'
                                            }}
                                            onChange={(e) => this.setState({ rootDomainName: e.target.value })}
                                            required
                                            autoFocus
                                          />
                                        </div>
                                        <div>
                                          <ul style={{
                                            textAlign: 'left'
                                          }}
                                          >
                                            <li>Double check the domain name if it's correct</li>
                                            <li>You must correctly mention subdomain and apex domain or your request might fail</li>
                                          </ul>
                                          <div style={{
                                            background: 'rgb(255, 116, 80)',
                                            fontWeight: 500,
                                            color: 'white',
                                            lineHeight: '1.2rem',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            textAlign: 'left'
                                          }}
                                          >
                                            Generating the CNAME records might take ~ 2mins.
                                            Once the CNAME is generated you MUST add the records in your domain provider console within 30mins.
                                            Otherwise verification may fail and the created CNAME would be deleted.
                                          </div>
                                        </div>
                                      </div>
                                    ),
                                    onOk: async () => {
                                      let domain: string = '';
                                      const nRootDomain = (this.state.rootDomainName || '').trim();
                                      const nSubdomain = (this.state.subdomainName || '').trim();
                                      if (nRootDomain && nSubdomain) {
                                        domain = `${nSubdomain}.${nRootDomain}`;
                                        let matchedVal;
                                        // eslint-disable-next-line no-useless-escape
                                        if (matchedVal = domain.match(/[:\/]+/)) {
                                          this.showErrorMsg(`Domain name not valid. It contains invalid char ${matchedVal[0]}`, 10000);
                                          return;
                                        }
                                        if (this.props.vanityDomains!.findIndex(d => d.domainName === domain) !== -1) {
                                          this.showErrorMsg('Domain already exists');
                                          return;
                                        }
                                        try {
                                          await this.props.addNewCustomDomain(domain, this.state.subdomainName, this.state.rootDomainName);
                                        } catch (e) {
                                          raiseDeferredError(e as Error);
                                          this.showErrorMsg('Another request might be in progress or something went wrong when requesting for custom domain. Please try again after sometime.', 10000);
                                        }
                                        return;
                                      }
                                      this.showErrorMsg('Not a valid domain', 5000);
                                    },
                                    onCancel: () => {
                                    }
                                  });
                                }}
                              >Add a new domain
                              </Button>
                            )
                            : <Upgrade inline subs={this.props.subs} clickedFrom="custom_domain" />}
                          {this.state.showError && (
                            <p>
                              <span className="err-line">{this.state.showError}</span>
                            </p>
                          )}
                        </div>
                      )}

                      <div />
                      {!!(this.props.vanityDomains || []).length && (
                        <p>
                          &nbsp;
                          <GTags.OurLink
                            className="support-bot-open"
                            style={{
                              display: 'inline'
                            }}
                          >
                            Talk to us
                          </GTags.OurLink> if you need any changes in the custom domains.
                        </p>
                      )}
                    </div>
                  )
                }]}
              />
            </Tags.Con>
          </GTags.MainCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Settings)); (withRouter(Settings));
