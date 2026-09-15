import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ImageWithFallback from './image-with-fallback';

it('uses a bundled image when absent or unavailable and retries a changed source', () => {
  const { rerender } = render(<ImageWithFallback alt="Profile" fallbackSrc="/avatar.svg" />);
  const image = screen.getByAltText('Profile');
  expect(image.getAttribute('src')).toBe('/avatar.svg');
  rerender(<ImageWithFallback alt="Profile" src="/first.jpg" fallbackSrc="/avatar.svg" />);
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe('/avatar.svg');
  rerender(<ImageWithFallback alt="Profile" src="/second.jpg" fallbackSrc="/avatar.svg" />);
  expect(image.getAttribute('src')).toBe('/second.jpg');
});
