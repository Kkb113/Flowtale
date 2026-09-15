import { ArrowRightOutlined, BankOutlined, LoadingOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import {
  RespOrg
} from '@fable/common/dist/api-contract';
import { CmnEvtProp } from '@fable/common/dist/types';
import { getDisplayableTime } from '@fable/common/dist/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'antd';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { Avatar, OurLink } from '../../common-styled';
import { OnboardingSteps } from '../../container/user-onboarding';
import Button from '../button';
import Input from '../input';
import { OrgItem } from './styled';

interface Props {
  orgCreateInputRef: React.RefObject<HTMLInputElement>;
  userOrgs: RespOrg[] | null;
  createNewOrg: (orgName: string) => Promise<RespOrg>;
  assignOrgToUser: (orgId: number) => Promise<RespOrg>;
  onSelect: (org:RespOrg) => void
}

export default function OrgCreate(props: Props): JSX.Element {
  const [orgName, setOrgName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isJoiningOrg, setIsJoiningOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgRid] = useState<number>();
  const [showCreateNewOrgForm, setShowCreateNewOrgForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCreateNewOrgForm) {
        props.orgCreateInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [showCreateNewOrgForm, props.orgCreateInputRef]);

  const handleJoinClick = async (orgId: number): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setSelectedOrgRid(orgId);
    setIsJoiningOrg(true);
    try {
      const org = await props.assignOrgToUser(orgId);
      traceEvent(AMPLITUDE_EVENTS.USER_ORG_ASSIGN, {
        org_name: org.displayName,
        type: 'join_existing'
      }, [CmnEvtProp.EMAIL, CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME]);
      if (mounted.current) props.onSelect(org);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'The workspace could not be opened.');
    } finally {
      busy.current = false;
      if (mounted.current) {
        setIsJoiningOrg(false);
        setSelectedOrgRid(undefined);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (busy.current || !orgName.trim()) return;
    busy.current = true;
    setError(null);
    setIsLoading(true);

    traceEvent(AMPLITUDE_EVENTS.USER_ORG_ASSIGN, {
      org_name: orgName,
      type: 'create_new'
    }, [CmnEvtProp.EMAIL, CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME]);

    try {
      const org = await props.createNewOrg(orgName.trim());
      if (mounted.current) props.onSelect(org);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'The workspace could not be created.');
    } finally {
      busy.current = false;
      if (mounted.current) setIsLoading(false);
    }
  };

  if (!props.userOrgs) return <div />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(480px - 4rem)',
        marginTop: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        pointerEvents: isJoiningOrg ? 'none' : 'all',
        opacity: isJoiningOrg ? 0.65 : 1
      }}
    >
      {error && <Alert type="error" showIcon message="Workspace setup failed" description={error} />}
      <div
        className="typ-h1"
        style={{
          textAlign: 'left',
          fontWeight: 600
        }}
      >
        Let's get your account
        up and running, shall we?
      </div>

      {props.userOrgs.length ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 0 auto',
          gap: '1rem',
          marginTop: '1rem',
          marginBottom: '1rem',
          width: '90%',
          alignItems: 'center'
        }}
        >
          <div className="typ-reg">Select from following organizations</div>
          <div
            style={{
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '90%',
              maxHeight: '200px'
            }}
          >
            {props.userOrgs.map(org => (
              <OrgItem
                key={org.rid}
                role="button"
                tabIndex={isJoiningOrg || isLoading ? -1 : 0}
                aria-label={`Open ${org.displayName}`}
                aria-disabled={isJoiningOrg || isLoading}
                onClick={() => handleJoinClick(org.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleJoinClick(org.id);
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: '1 0 auto'
                }}
                >
                  <div className="typ-h2">{org.displayName}</div>
                  <div
                    className="typ-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Created by&nbsp;&nbsp;
                    <Avatar
                      src={org.createdBy.avatar}
                      alt="avatar"
                      style={{
                        height: '16px',
                        width: '16px',
                        borderRadius: '16px',
                        display: 'inline'
                      }}
                    />
                &nbsp; {org.createdBy.firstName} &nbsp; 🕑 {getDisplayableTime(new Date(org.createdAt))}
                  </div>
                </div>
                <div>
                  {selectedOrgId === org.id ? <LoadingOutlined /> : <ArrowRightOutlined />}
                </div>
              </OrgItem>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="typ-reg"
          style={{
            color: 'gray'
          }}
        >
          Please create an org account to add all your demos & invite team members.
        </div>
      )}

      {!(showCreateNewOrgForm || !props.userOrgs.length) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '90%',
        }}
        >
          <div
            style={{
              position: 'relative',
              height: '2px',
              borderBottom: '1px solid lightgray',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                padding: '8px'
              }}
            >
              or
            </div>
          </div>
          <OurLink
            href={`#${OnboardingSteps.ORGANIZATION_DETAILS}`}
            style={{
              textAlign: 'center'
            }}
            onClick={() => setShowCreateNewOrgForm(true)}
          >
            Create a new organization
          </OurLink>
        </div>
      )}

      {(showCreateNewOrgForm || !props.userOrgs.length) && (
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '90%',
          gap: '1rem'
        }}
      >
        <Input
          label="Your org name"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          innerRef={props.orgCreateInputRef}
          required
        />
        <Button
          style={{ width: '100%' }}
          icon={<BankOutlined />}
          iconPlacement="left"
          type="submit"
          disabled={isLoading || orgName.trim() === ''}
        >
          {isLoading ? 'Loading...' : 'Create New'}
        </Button>
      </form>)}
    </div>
  );
}
