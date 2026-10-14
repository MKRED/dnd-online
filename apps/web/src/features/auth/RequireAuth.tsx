import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { loginPathFor } from './returnPath';

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  // Гостя ведём на вход, запомнив страницу: ссылку на персонажа после входа откроем снова.
  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to={loginPathFor(location.pathname + location.search + location.hash)}
      replace
    />
  );
}

export default RequireAuth;
