import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNextPath } from './returnPath';

function RequireGuest() {
  const { user, loading } = useAuth();
  const next = useNextPath();

  if (loading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  // После входа или регистрации setUser сразу перерисовывает этот маршрут — уводим туда,
  // куда человек шёл, а не на главную.
  return user ? <Navigate to={next} replace /> : <Outlet />;
}

export default RequireGuest;
