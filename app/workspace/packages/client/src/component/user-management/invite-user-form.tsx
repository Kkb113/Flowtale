import React, { useState } from 'react';
import api from '@fable/common/dist/api';
import { ApiResp, ReqNewInvite, RespNewInvite, ResponseStatus } from '@fable/common/dist/api-contract';
import Input from '../input';
import Button from '../button';
import UrlCodeShare from '../publish-preview/url-code-share';

export const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;
export const baseURLStructured = new URL(baseURL);

export default function InviteUserForm(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [invitedEmail, setInvitedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setInviteCode('');

    const data = await api<ReqNewInvite, ApiResp<RespNewInvite>>('/new/invite', {
      auth: true,
      body: {
        invitedEmail
      },
    });

    if (data.status === ResponseStatus.Success) {
      setInviteCode(data.data.code);
    }

    setIsLoading(false);
  };

  return (
    <>
      <div className="modal-title">Invite a user</div>
      Please enter the email ID of the person that you want to invite to Fable.
      <form
        onSubmit={handleSubmit}
        style={{
          margin: '1rem 0 1rem 0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ flex: 1 }}>
          <Input
            label="Email"
            type="email"
            value={invitedEmail}
            onChange={e => setInvitedEmail(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          style={{
            width: isLoading ? '240px' : '100px',
            transition: 'width 0.15s ease-out',
            display: 'block',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}
        >
          {isLoading ? 'Generating an invite link...' : 'Invite'}
        </Button>
      </form>

      {inviteCode
      && (
        <div
          style={{
            margin: '1rem 0 1rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <span>
            You can share the link below with the same person.
            The user can join Fable by clicking on this link.
          </span>
          <UrlCodeShare url={`${baseURL}/join/org?ic=${inviteCode}`} />
        </div>
      )}
    </>
  );
}
