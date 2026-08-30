import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

export default function InviteUser() {
  const [searchParams] = useSearchParams();
  return (
    <Navigate to={`/?${searchParams.toString()}`} />
  );
}
