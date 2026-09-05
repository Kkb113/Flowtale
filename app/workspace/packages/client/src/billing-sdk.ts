import { isLocalDevelopment } from './local-development';

export interface CheckoutOptions {
  hostedPage: () => Promise<unknown>;
  loaded?: () => void;
  error?: (error: Error) => void;
  close?: () => void;
  success?: () => void;
  step?: () => void;
}

interface BillingInstance { openCheckout: (options: CheckoutOptions) => void }
interface BillingSdk { init: (options: { site: string }) => BillingInstance }
let loading: Promise<BillingInstance> | undefined;

/** Billing loads on a purchase action. A missing provider never prevents authoring. */
export function getBillingInstance(): Promise<BillingInstance> {
  if (isLocalDevelopment) return Promise.reject(new Error('Purchases are unavailable in local development.'));
  const site = process.env.REACT_APP_CHARGEBEE_SITE;
  if (!site) return Promise.reject(new Error('Billing is not configured. Contact your workspace administrator.'));
  if (loading) return loading;
  loading = new Promise<BillingInstance>((resolve, reject) => {
    const sdk = (): BillingSdk | undefined => (window as Window & { Chargebee?: BillingSdk }).Chargebee;
    if (sdk()) {
      try { resolve(sdk()!.init({ site })); } catch { reject(new Error('Billing could not initialize. Please retry.')); }
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.chargebee.com/v2/chargebee.js';
    script.async = true;
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); return; }
      try {
        if (!sdk()) throw new Error('Missing billing SDK');
        resolve(sdk()!.init({ site }));
      } catch {
        script.remove();
        reject(new Error('Billing could not initialize. Please retry.'));
      }
    };
    const timer = setTimeout(() => finish(new Error('Billing took too long to load. Please retry.')), 15000);
    script.onload = () => finish();
    script.onerror = () => finish(new Error('Billing could not load. Check your connection and retry.'));
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
