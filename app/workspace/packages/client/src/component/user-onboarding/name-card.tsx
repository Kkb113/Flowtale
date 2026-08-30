import { ArrowRightOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import {
  RespUser
} from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { CmnEvtProp } from '@fable/common/dist/types';
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { OnboardingSteps, USER_ONBOARDING_ROUTE } from '../../container/user-onboarding';
import { setEventCommonState } from '../../utils';
import Button from '../button';
import Input from '../input';

interface Props {
  principal: RespUser;
  updateUser: (firstName: string, lastName: string) => Promise<void>;
}

export default function NameCard(props: Props): JSX.Element {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getQueryParmsStrWithQuestionMark = () => {
    const queryParamStr = searchParams.toString();
    return queryParamStr ? `?${queryParamStr}` : '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    await props.updateUser(firstName, lastName);
    setIsLoading(false);

    try {
      setEventCommonState(CmnEvtProp.FIRST_NAME, firstName);
      setEventCommonState(CmnEvtProp.LAST_NAME, lastName);
      traceEvent(
        AMPLITUDE_EVENTS.USER_SIGNUP,
        {},
        [CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME, CmnEvtProp.EMAIL]
      );

      // @ts-ignore
      window.gr('track', 'conversion', { email: props.principal.email });
    } catch (err) {
      raiseDeferredError(new Error('User not defined for Reditus logging'));
    }

    navigate(`/${USER_ONBOARDING_ROUTE}${getQueryParmsStrWithQuestionMark()}#${OnboardingSteps.ORGANIZATION_DETAILS}`, { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(480px - 4rem)',
        marginTop: '36px',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '5rem',
      }}
    >
      <div
        className="typ-h1"
        style={{
          textAlign: 'left',
          fontWeight: 600
        }}
      >
        Create stunning demos with Fable's AI copilot!
      </div>
      <div
        className="type-reg"
        style={{
          textAlign: 'left',
        }}
      >
        Before we get started, please tell us a little bit about yourself.
      </div>
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
          label="First name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
        <Button
          icon={<ArrowRightOutlined />}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Start for free'}
        </Button>
      </form>
    </div>
  );
}
