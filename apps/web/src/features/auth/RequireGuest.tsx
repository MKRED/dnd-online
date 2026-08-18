import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function RequireGuest() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export default RequireGuest;
