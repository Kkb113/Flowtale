export function dataCdnBaseUrl(
  configured = process.env.REACT_APP_DATA_CDN,
  environment = process.env.REACT_APP_ENVIRONMENT,
): string {
  if (!configured) throw new Error('The demo asset endpoint is not configured');
  const url = new URL(configured.includes('://') ? configured : `https://${configured}`);
  const localHttp = environment === 'local' && url.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!localHttp && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash) {
    throw new Error('The demo asset endpoint must use HTTPS, or loopback HTTP in local development');
  }
  return url.toString().replace(/\/$/, '');
}
