import React from 'react';
import { render, screen } from '@testing-library/react';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import ErrorBoundary from './index';

const mockFailure = new Error('Module failed to initialize');
jest.mock('react-router-dom', () => ({ useRouteError: () => mockFailure }));
jest.mock('@fable/common/dist/sentry', () => ({ sentryCaptureException: jest.fn() }));

it('offers recovery for ordinary route errors and reports the original error without rethrowing', () => {
  const view = render(<ErrorBoundary />);
  expect(screen.getByRole('alert')).toHaveTextContent('This page could not be loaded');
  expect(screen.getByRole('button', { name: 'Retry loading' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Back to demos' })).toHaveAttribute('href', '/demos');
  expect(sentryCaptureException).toHaveBeenCalledWith(mockFailure);
  view.rerender(<ErrorBoundary />);
  expect(sentryCaptureException).toHaveBeenCalledTimes(1);
});

it('keeps recovery available if error reporting itself fails', () => {
  (sentryCaptureException as jest.Mock).mockImplementationOnce(() => { throw new Error('Diagnostics unavailable'); });
  expect(() => render(<ErrorBoundary />)).not.toThrow();
  expect(screen.getByRole('button', { name: 'Retry loading' })).toBeEnabled();
});
