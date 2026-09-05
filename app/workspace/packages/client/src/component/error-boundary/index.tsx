import React, { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { sentryCaptureException } from '@fable/common/dist/sentry';

function ErrorBoundary(): JSX.Element {
  const err = useRouteError();
  useEffect(() => {
    // Report the original stack once; rethrowing during render causes another
    // uncaught error and previously left all non-chunk failures on a blank page.
    try {
      sentryCaptureException(err instanceof Error ? err : new Error('Page loading failed'));
    } catch { /* Diagnostics must not break the recovery controls. */ }
  }, [err]);
  return (
    <main style={{ padding: 32, maxWidth: 640, margin: 'auto' }}>
      <div role="alert">
        <h1>This page could not be loaded</h1>
        <p>Retry loading the page, or return to your demos.</p>
      </div>
      <button type="button" onClick={() => window.location.reload()}>Retry loading</button>
      {' '}
      <a href="/demos">Back to demos</a>
    </main>
  );
}

export default ErrorBoundary;
