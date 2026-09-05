export function validateLocalDevelopment(
  enabled: string | undefined,
  environment: string | undefined,
  nodeEnvironment: string | undefined,
  hostname: string,
): boolean {
  if (enabled !== 'true') return false;
  if (environment !== 'local' || nodeEnvironment === 'production'
    || !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error('Local fixture authentication requires a development build on a loopback origin.');
  }
  return true;
}

export const isLocalDevelopment = validateLocalDevelopment(
  process.env.REACT_APP_LOCAL_DEVELOPMENT,
  process.env.REACT_APP_ENVIRONMENT,
  process.env.NODE_ENV,
  window.location.hostname,
);
