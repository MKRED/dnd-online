import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireGuest } from './features/auth';
import CharacterCreatePage from './pages/CharacterCreatePage';
import CharactersPage from './pages/CharactersPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/characters', element: <CharactersPage /> },
          { path: '/characters/new', element: <CharacterCreatePage /> },
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
    ],
  },
]);
