import { Center, Loader } from '@mantine/core';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default RequireAuth;
