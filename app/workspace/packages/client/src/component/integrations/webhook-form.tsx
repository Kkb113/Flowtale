import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { nord } from '@uiw/codemirror-theme-nord';
import { json } from '@codemirror/lang-json';
import { DeleteOutlined, FileTextOutlined, SaveOutlined } from '@ant-design/icons';
import {
  ApiResp,
  PlatformIntegrationType,
  ReqCreateOrUpdateTenantIntegration,
  RespPlatformIntegration,
  RespTenantIntegration
} from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import * as Tags from './styled';
import Button from '../button';
import { isValidUrl } from '../../utils';

interface TenentConfig {
  name: string;
  url: string;
  reqHeaders: string;
  reqBody: string;
}

interface ReqCreateWebhookConfig extends ReqCreateOrUpdateTenantIntegration {
  tenantConfig: TenentConfig
}

const DEFAULT_REQUEST_BODY_CODE = JSON.stringify({
  email: '{{ email }}',
  names: {
    givenName: '{{ first_name }}',
    familyName: '{{ last_name }}',
  },
  demoUrl: '{{ demo_rid }}',
  id: 1234
}, null, 2);

const DEFAULT_REQUEST_HEADER_CODE = JSON.stringify({
  'Content-Type': 'application/json',
  Authorization: 'Bearer xxxx-xxx-xxx-xxxx'
}, null, 2);

interface Props {
  webhook: RespTenantIntegration;
  supportedEvents: string[];
  deleteWebhook: (id: number) => void;
}

export default function WebhookForm(props: Props): JSX.Element {
  const [webhookName, setWebhookName] = useState((props.webhook.tenantConfig as TenentConfig)?.name || 'My Webhook');
  const [event, setEvent] = useState(props.webhook.event || props.supportedEvents[0]);
  const [webhookUrl, setWebhookUrl] = useState((props.webhook.tenantConfig as TenentConfig)?.url || '');
  const [reqBody, setReqBody] = useState(
    (props.webhook.tenantConfig as TenentConfig)?.reqBody || DEFAULT_REQUEST_BODY_CODE
  );
  const [reqHeaders, setReqHeaders] = useState(
    (props.webhook.tenantConfig as TenentConfig)?.reqHeaders || DEFAULT_REQUEST_HEADER_CODE
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const validateReqBody = (): boolean => {
    const isUrlValidErr = isValidUrl(webhookUrl) ? '' : 'URL';
    const isReqBodyValidErr = reqBody ? '' : 'ReqBody';
    const isReqHeadersValidErr = reqHeaders ? '' : 'ReqHeaders';

    const isInvalid = Boolean(isUrlValidErr || isReqBodyValidErr || isReqHeadersValidErr);

    if (isInvalid) {
      const error = `Error: Invalid 
      ${isUrlValidErr}
      ${isReqBodyValidErr}
      ${isReqHeadersValidErr}
      `;

      setErrorMsg(error);
    }

    return !isInvalid;
  };

  const handleDeleteOnClick = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      const resp = await api<any, ApiResp<RespPlatformIntegration[]>>(
        `/delete/tenant_integration/${props.webhook.id}`,
        { auth: true, body: '{}' }
      );

      props.deleteWebhook(props.webhook.id);
    } catch (e) {
      raiseDeferredError(e as Error);
    }

    setIsDeleting(false);
  };

  const handleSaveOnClick = async (): Promise<void> => {
    setErrorMsg('');

    if (!validateReqBody()) return;

    setIsSaving(true);

    try {
      const resp = await api<ReqCreateWebhookConfig, ApiResp<RespPlatformIntegration[]>>('/tenant_integration', {
        auth: true,
        body: {
          integrationType: PlatformIntegrationType.FableWebhook,
          event,
          tenantIntegrationId: props.webhook.id,
          tenantConfig: {
            name: webhookName,
            url: webhookUrl,
            reqBody,
            reqHeaders
          }
        }
      });
    } catch (e) {
      raiseDeferredError(e as Error);
    }

    setIsSaving(false);
  };

  return (
    <Tags.WebhookConfCard key={props.webhook.relay}>
      <div className="header">
        <Tags.DottedBorderedInput
          value={webhookName}
          onChange={e => setWebhookName(e.target.value)}
          size="middle"
          placeholder="My Webhook"
        />
        <p className="xtra">
          When Fable calls this webhook, it must return HTTP StatusCode 200.
          If any other StatusCode is returned by the webhook server, Fable makes 2 more attempts to
          redeliver the data. These two calls are made in 30mins interval.
        </p>
      </div>
      <div className="body">
        <div className="when">
          <p>
            When the following event happens in a Fable demo
          </p>
          <Tags.BordededSelect
            onChange={(val) => setEvent(val as string)}
            value={event}
            size="middle"
            options={props.supportedEvents.map(ev => ({
              value: ev,
              label: ev
            }))}
          />
        </div>
        <div className="then">
          <p>
            Then&nbsp;
            <span className="code">
              POST
            </span>
            &nbsp;data to URL&nbsp;
          </p>
          <Tags.BorderedInput
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            size="middle"
            placeholder="https://your.webhook.url.com/path"
          />
        </div>
        <div className="req-body">
          <p>
            With the following request body
          </p>
          <div className="help">
            You can use <span className="code">{'{{var_name}}'}</span> to refer a variable name from the selected event.
                    &nbsp;<span className="actn">Click here to see the list of available variables.</span>
          </div>
          <CodeMirror
            onChange={val => setReqBody(val)}
            lang="json"
            value={reqBody}
            extensions={[json()]}
            theme={nord}
            style={{
              fontSize: '0.9rem'
            }}
          />
        </div>
        <div className="req-header">
          <p>
            And following request headers
          </p>
          <div className="help">
            Add all the headers in a single json object. Fable forward the header as is to the webhook.
          </div>
          <CodeMirror
            onChange={val => setReqHeaders(val)}
            lang="json"
            value={reqHeaders}
            extensions={[json()]}
            theme={nord}
            style={{
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>
      <div className="btn-con">
        {props.webhook.id && (
          <Button
            onClick={handleDeleteOnClick}
            size="small"
            icon={<DeleteOutlined />}
            iconPlacement="left"
            intent="secondary"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        )}

        {/* props.webhook.id && (
          <Button size="small" icon={<FileTextOutlined />} iconPlacement="left" intent="secondary">Log</Button>
        ) */}

        <Button
          onClick={handleSaveOnClick}
          size="small"
          icon={<SaveOutlined />}
          iconPlacement="left"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {errorMsg && (
      <div
        style={{
          background: 'rgba(255, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '8px',
          marginTop: '0.75rem',
          textAlign: 'center',
        }}
      >
        {errorMsg}
      </div>
      )}
    </Tags.WebhookConfCard>
  );
}
