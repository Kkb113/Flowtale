export function draftAssetUrl(
  kind: 'screen' | 'tour' | 'hub',
  rid: string,
  filename: string,
  endpoint = process.env.REACT_APP_API_ENDPOINT,
): URL {
  if (!endpoint) throw new Error('The draft API endpoint is not configured');
  return new URL(`/v1/f/draft/${kind}/${encodeURIComponent(rid)}/${encodeURIComponent(filename)}`, endpoint);
}

/** Only this configured API route can opt a URL-only asset read into authentication. */
export function isDraftAssetUrl(value: string, endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  try {
    const url = new URL(value);
    return url.origin === new URL(endpoint).origin && !url.username && !url.password
      && /^\/v1\/f\/draft\/(screen|tour|hub)\/[^/]+\/(index|edits|loader)\.json$/.test(url.pathname);
  } catch { return false; }
}
