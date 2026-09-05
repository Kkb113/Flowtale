import React, { useEffect, useRef, useState } from 'react';
import { LoadingOutlined, WalletFilled } from '@ant-design/icons';
import { ReqSubscriptionInfo, RespSubscription } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import { getBillingInstance } from '../../billing-sdk';
import { isLocalDevelopment } from '../../local-development';
import Button from '../button';
import { amplitudeBuyMoreQuillyCredit } from '../../amplitude';

function BuyMoreCredit({
  currentCredit,
  checkCredit,
  showCreditInfo,
  clickedFrom,
  title,
  showIcon
}:
{
  currentCredit: number;
  checkCredit: ()=> Promise<RespSubscription>,
  showCreditInfo: boolean,
  clickedFrom: 'header' | 'create-demo' | 'preview' | 'billing',
  title?: string,
  showIcon?: boolean
}): JSX.Element {
  const [isBuyMoreCreditInProcess, setIsBuyMoreCreditInProgress] = useState(false);
  const [error, setError] = useState('');
  const [awaitingCredit, setAwaitingCredit] = useState(false);
  const mounted = useRef(true);
  const active = useRef(false);
  const creditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balance = useRef(currentCredit);
  const purchaseBalance = useRef<number | null>(null);
  const polling = useRef(false);
  balance.current = currentCredit;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (creditTimer.current) clearTimeout(creditTimer.current);
    };
  }, []);

  const refreshCredits = (): void => {
    if (polling.current) return;
    polling.current = true;
    const previous = purchaseBalance.current ?? balance.current;
    const deadline = Date.now() + 120000;
    active.current = true;
    setError('');
    setAwaitingCredit(true);
    setIsBuyMoreCreditInProgress(true);
    const check = async (): Promise<void> => {
      try {
        const updated = await checkCredit();
        if (!mounted.current) return;
        if (updated.availableCredits > previous) {
          amplitudeBuyMoreQuillyCredit(clickedFrom, updated.availableCredits - previous);
          setAwaitingCredit(false);
        } else if (Date.now() < deadline) {
          creditTimer.current = setTimeout(check, 2000);
          return;
        } else {
          setError('Payment was reported successful; credits have not updated yet. Check again without purchasing twice.');
        }
      } catch {
        if (!mounted.current) return;
        setError('Could not refresh credits. Check again without making another purchase.');
      }
      active.current = false;
      polling.current = false;
      setIsBuyMoreCreditInProgress(false);
    };
    check();
  };

  const buyMoreCredit = async (): Promise<void> => {
    if (active.current) return;
    active.current = true;
    purchaseBalance.current = balance.current;
    setError('');
    setIsBuyMoreCreditInProgress(true);
    try {
      const instance = await getBillingInstance();
      if (!mounted.current) return;
      let paymentCompleted = false;
      const finish = (): void => {
        active.current = false;
        if (mounted.current) setIsBuyMoreCreditInProgress(false);
      };
      instance.openCheckout({
        hostedPage: () => api<ReqSubscriptionInfo | undefined, null>('/credittopupurl', { method: 'POST', auth: true }),
        error: () => { finish(); if (mounted.current) setError('Checkout could not open. Please retry.'); },
        close: () => { if (!paymentCompleted) finish(); },
        success: () => { paymentCompleted = true; if (mounted.current) refreshCredits(); },
      });
    } catch (cause) {
      active.current = false;
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : 'Checkout is unavailable. Please retry.');
        setIsBuyMoreCreditInProgress(false);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
      }}
    >
      {isLocalDevelopment && <span>Purchases are disabled in local development.</span>}
      {error && <span role="alert">{error}</span>}
      {showCreditInfo
      && (
      <div>
        <div>Your AI credit is not enough</div>
        <div style={{
          fontSize: '0.9rem',
        }}
        >
          Your current credit:&nbsp;
          <span style={{
            color: 'white',
            background: '#16023e',
            padding: '1px 6px',
            borderRadius: '6px'
          }}
          >
            {currentCredit} <WalletFilled />
          </span>
        </div>
      </div>
      )}
      <Button
        type="button"
        style={{
          backgroundColor: '#fedf64',
          color: 'black',
        }}
        onClick={awaitingCredit ? refreshCredits : buyMoreCredit}
        disabled={isBuyMoreCreditInProcess || isLocalDevelopment}
        icon={isBuyMoreCreditInProcess ? <LoadingOutlined /> : showIcon ? <WalletFilled /> : null}
        iconPlacement={isBuyMoreCreditInProcess ? 'right' : 'left'}
      >
        {awaitingCredit ? 'Check credits' : title || 'Buy more credit'}
      </Button>
    </div>
  );
}

export default BuyMoreCredit;
