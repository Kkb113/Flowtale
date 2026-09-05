import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BuyMoreCredit from './buy-more-credit';
import { CheckoutOptions, getBillingInstance } from '../../billing-sdk';

jest.mock('../../billing-sdk', () => ({ getBillingInstance: jest.fn() }));
jest.mock('../../local-development', () => ({ isLocalDevelopment: false }));
jest.mock('../../amplitude', () => ({ amplitudeBuyMoreQuillyCredit: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });

function show(checkCredit = jest.fn()) {
  return render(<BuyMoreCredit currentCredit={100} checkCredit={checkCredit} showCreditInfo clickedFrom="create-demo" />);
}

it('does not initialize billing when a creation screen merely renders', () => {
  show();
  expect(screen.getByRole('button', { name: 'Buy more credit' })).toBeEnabled();
  expect(getBillingInstance).not.toHaveBeenCalled();
});

it('reports a failed SDK load and allows the same purchase action to retry', async () => {
  const openCheckout = jest.fn();
  (getBillingInstance as jest.Mock).mockRejectedValueOnce(new Error('Billing unavailable'))
    .mockResolvedValue({ openCheckout });
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Buy more credit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Billing unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Buy more credit' }));
  await waitFor(() => expect(openCheckout).toHaveBeenCalledTimes(1));
});

it('does not overlap credit requests and stops scheduling after unmount', async () => {
  jest.useFakeTimers();
  let options!: CheckoutOptions;
  (getBillingInstance as jest.Mock).mockResolvedValue({ openCheckout: (value: CheckoutOptions) => { options = value; } });
  let resolve!: (value: any) => void;
  const check = jest.fn(() => new Promise<any>(done => { resolve = done; }));
  const view = show(check);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Buy more credit' })); });
  act(() => options.success!());
  act(() => options.success!());
  act(() => { jest.advanceTimersByTime(6000); });
  expect(check).toHaveBeenCalledTimes(1);
  view.unmount();
  await act(async () => resolve({ availableCredits: 100 }));
  act(() => { jest.advanceTimersByTime(120000); });
  expect(check).toHaveBeenCalledTimes(1);
});

it('refreshes a successful purchase after an outage without opening a second checkout', async () => {
  let options!: CheckoutOptions;
  (getBillingInstance as jest.Mock).mockResolvedValue({ openCheckout: (value: CheckoutOptions) => { options = value; } });
  const check = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ availableCredits: 500 });
  show(check);
  fireEvent.click(screen.getByRole('button', { name: 'Buy more credit' }));
  await waitFor(() => expect(options).toBeDefined());
  act(() => options.success!());
  expect(await screen.findByRole('alert')).toHaveTextContent('without making another purchase');
  fireEvent.click(screen.getByRole('button', { name: 'Check credits' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Buy more credit' })).toBeEnabled());
  expect(getBillingInstance).toHaveBeenCalledTimes(1);
  expect(check).toHaveBeenCalledTimes(2);
});
