import { validateLocalDevelopment } from './local-development';

it('keeps local authentication disabled unless explicitly enabled', () => {
  expect(validateLocalDevelopment(undefined, 'local', 'development', 'localhost')).toBe(false);
});

it.each(['prod', 'staging', undefined])('refuses the %s profile', environment => {
  expect(() => validateLocalDevelopment('true', environment, 'development', 'localhost')).toThrow();
});

it('refuses production bundles and public origins', () => {
  expect(() => validateLocalDevelopment('true', 'local', 'production', 'localhost')).toThrow();
  expect(() => validateLocalDevelopment('true', 'local', 'development', 'app.example.com')).toThrow();
});

it('allows the explicit loopback development configuration', () => {
  expect(validateLocalDevelopment('true', 'local', 'development', 'localhost')).toBe(true);
});
