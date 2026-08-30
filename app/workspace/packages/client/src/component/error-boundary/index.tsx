import React from 'react';
import { Outlet, useNavigate, useRouteError } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import InfoCon from '../info-con';

function ErrorBoundary(): JSX.Element {
  const navigate = useNavigate();
  const err = useRouteError();

  raiseDeferredError(err as Error);
  if (err && (err as Error).name === 'ChunkLoadError') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <InfoCon
          heading=""
          body={
            <> Something wrong with automatic redirection. <br />
              Please click the button below to go to Fable.
            </>
        }
          btns={[{
            type: 'primary',
            text: 'Reload',
            linkTo: '/demos'
          }]}
        />
      </div>
    );
  }

  return <Outlet />;
}

export default ErrorBoundary;
