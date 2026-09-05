import React from 'react';
import { render, screen } from '@testing-library/react';
import CreationStep from './creation-step';

it('only exposes the current step while preserving input when revisiting a step', () => {
  const step = (isVisible: boolean): JSX.Element => (
    <CreationStep isVisible={isVisible} animationIn="fadeIn" animationOut="fadeOut" animateOnMount={false}>
      <label htmlFor="draft-name">Draft name<input id="draft-name" defaultValue="My recording" /></label>
      <button type="button">Continue</button>
    </CreationStep>
  );
  const { rerender } = render(step(true));
  const input = screen.getByRole('textbox') as HTMLInputElement;
  input.value = 'Unsaved name';
  rerender(step(false));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  rerender(step(true));
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Unsaved name');
});
