import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../../constants';
import FullPageTopLoader from '../loader/full-page-top-loader';

interface Props {
}

export default function OrgSelectRelay(props: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY);
    navigate('/', { replace: true });
  });

  return <FullPageTopLoader showLogo />;
}
