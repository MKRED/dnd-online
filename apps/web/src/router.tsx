import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth, RequireGuest } from './features/auth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
]);
