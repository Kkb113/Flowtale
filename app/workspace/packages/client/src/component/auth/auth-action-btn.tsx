import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LogIn from './login';
import LogOut from './logout';

function AuthActionBtn() {
  const { isAuthenticated } = useAuth0();
  return isAuthenticated ? <LogOut title="Fable - Login" /> : <LogIn title="Fable - Logout" />;
}

export default AuthActionBtn;
