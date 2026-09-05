import { ArrowRightOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import {
  RespUser
} from '@fable/common/dist/api-contract';
import { CmnEvtProp } from '@fable/common/dist/types';
import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'antd';
import { captureMessage } from '@sentry/react';
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
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const getQueryParmsStrWithQuestionMark = () => {
    const queryParamStr = searchParams.toString();
    return queryParamStr ? `?${queryParamStr}` : '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (pending.current || !firstName.trim()) return;
    pending.current = true;
    setError(null);
    setIsLoading(true);
    try {
      await props.updateUser(firstName.trim(), lastName.trim());
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Your name could not be saved.');
      return;
    } finally {
      pending.current = false;
      if (mounted.current) setIsLoading(false);
    }
    if (!mounted.current) return;

    try {
      setEventCommonState(CmnEvtProp.FIRST_NAME, firstName);
      setEventCommonState(CmnEvtProp.LAST_NAME, lastName);
      traceEvent(
        AMPLITUDE_EVENTS.USER_SIGNUP,
        {},
        [CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME, CmnEvtProp.EMAIL]
      );

      const referralTracker = (window as Window & { gr?: (...args: unknown[]) => void }).gr;
      if (typeof referralTracker === 'function') referralTracker('track', 'conversion', { email: props.principal.email });
    } catch (err) {
      captureMessage('Optional signup analytics were not recorded', 'warning');
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
      {error && <Alert type="error" showIcon message="Your name could not be saved" description={error} />}
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
          disabled={isLoading || !firstName.trim()}
        >
          {isLoading ? 'Loading...' : 'Start for free'}
        </Button>
      </form>
    </div>
  );
}
