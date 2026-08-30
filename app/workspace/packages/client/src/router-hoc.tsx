// Ref: https://stackoverflow.com/a/70937792
//
import React, { ComponentType } from 'react';
import { useLocation, useNavigate, useNavigation, useParams, useSearchParams } from 'react-router-dom';

export interface WithRouterProps<T = ReturnType<typeof useParams>> {
  history: {
    back: () => void;
    goBack: () => void;
    location: ReturnType<typeof useLocation>;
    push: (url: string, state?: any) => void;
  };
  location: ReturnType<typeof useLocation>;
  match: {
    params: T;
  };
  navigate: ReturnType<typeof useNavigate>;
  searchParams: URLSearchParams;
  loadingState: 'idle' | 'loading' | 'submitting'
}

export const withRouter = <P extends object>(Comp: ComponentType<P>) => function (props: Omit<P, keyof WithRouterProps>) {
  const location = useLocation();
  const match = { params: useParams() };
  const navigate = useNavigate();
  const { state: loadingState } = useNavigation();
  const searchParams = useSearchParams();

  const history = {
    back: () => navigate(-1),
    goBack: () => navigate(-1),
    location,
    push: (url: string, state?: any) => navigate(url, { state }),
    replace: (url: string, state?: any) => navigate(url, {
      replace: true,
      state,
    }),
  };

  return (
    <Comp
      history={history}
      location={location}
      searchParams={searchParams[0]}
      match={match}
      navigate={navigate}
      loadingState={loadingState}
      {...(props as P)}
    />
  );
};
