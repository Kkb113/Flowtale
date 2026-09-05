import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrgCreate from './org-create';
import NameCard from './name-card';
import Usecase from './usecase';

jest.mock('../../container/user-onboarding', () => ({
  OnboardingSteps: { ORGANIZATION_DETAILS: 'organization-details' }, USER_ONBOARDING_ROUTE: 'welcome',
}));
jest.mock('@fable/common/dist/amplitude', () => ({ traceEvent: jest.fn() }));
jest.mock('../../utils', () => ({ setEventCommonState: jest.fn() }));

it('retains the workspace name and permits retry after a failed create', async () => {
  const org = { id: 1, displayName: 'Demo' } as any;
  const create = jest.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(org);
  const onSelect = jest.fn();
  render(<OrgCreate
    orgCreateInputRef={React.createRef()}
    userOrgs={[]}
    createNewOrg={create}
    assignOrgToUser={jest.fn()}
    onSelect={onSelect}
  />);
  fireEvent.change(screen.getByLabelText('Your org name'), { target: { value: 'Demo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create New' }));
  await screen.findByText('Storage unavailable');
  expect(onSelect).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Your org name') as HTMLInputElement).value).toBe('Demo');
  fireEvent.click(screen.getByRole('button', { name: 'Create New' }));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(org));
  expect(create).toHaveBeenCalledTimes(2);
});

it('serializes keyboard workspace selection and restores it after failure', async () => {
  const org = { id: 1,
    rid: 'one',
    displayName: 'Demo',
    createdAt: new Date().toISOString(),
    createdBy: { avatar: '', firstName: 'Local' } } as any;
  let fail!: (error: Error) => void;
  const join = jest.fn().mockImplementation(() => new Promise((resolve, reject) => { fail = reject; }));
  render(<OrgCreate
    orgCreateInputRef={React.createRef()}
    userOrgs={[org]}
    createNewOrg={jest.fn()}
    assignOrgToUser={join}
    onSelect={jest.fn()}
  />);
  const button = screen.getByRole('button', { name: 'Open Demo' });
  fireEvent.keyDown(button, { key: 'Enter' });
  fireEvent.keyDown(button, { key: ' ' });
  expect(join).toHaveBeenCalledTimes(1);
  fail(new Error('Access changed'));
  await screen.findByText('Access changed');
  expect(button.getAttribute('aria-disabled')).toBe('false');
  expect(button.tabIndex).toBe(0);
});

it('preserves name input after a failed save and recovers without a referral SDK', async () => {
  const update = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
  render(<MemoryRouter><NameCard principal={{ email: 'local@fable.local' } as any} updateUser={update} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Local' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start for free' }));
  await screen.findByText('Offline');
  fireEvent.click(screen.getByRole('button', { name: 'Start for free' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Start for free' }) as HTMLButtonElement).disabled)
    .toBe(false));
  expect(screen.queryByText('Offline')).toBeNull();
  expect(update).toHaveBeenCalledTimes(2);
});

it('retains use case choices on failure, ignores unchecked other text and blocks skip during save', async () => {
  const update = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
  const next = jest.fn();
  render(<Usecase updateUseCasesForOrg={update} onSubmit={next} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Marketing/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Others' }));
  fireEvent.change(screen.getByLabelText('Enter other usecases'), { target: { value: 'Hidden text' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Others' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start for free' }));
  expect((screen.getByRole('button', { name: 'Skip' }) as HTMLButtonElement).disabled).toBe(true);
  await screen.findByText('Offline');
  expect(next).not.toHaveBeenCalled();
  expect(update).toHaveBeenLastCalledWith(['marketing'], '');
  fireEvent.click(screen.getByRole('button', { name: 'Start for free' }));
  await waitFor(() => expect(next).toHaveBeenCalledTimes(1));
});
