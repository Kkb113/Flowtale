import React, { Suspense } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

const ProtectedRoutes = React.lazy(() => import('./index'));

export function PreviewContent({ component: Component }: {
  component: React.ComponentType<{ staging: boolean; title: string }>;
}): JSX.Element {
  const [searchParams] = useSearchParams();
  const staging = Boolean(searchParams.get('staging'));
  return <Component key={String(staging)} staging={staging} title="Fable" />;
}

// Published playback never starts an authentication session. Draft previews use
// the same account/workspace gate as authoring, including inside a fresh iframe.
export default function PreviewRoutes(): JSX.Element {
  const [searchParams] = useSearchParams();
  return searchParams.get('staging') ? (
    <Suspense fallback={<FullPageTopLoader showLogo />}>
      <ProtectedRoutes />
    </Suspense>
  ) : <Outlet />;
}
