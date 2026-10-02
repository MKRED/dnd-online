import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireGuest } from './features/auth';
import ApiTokensPage from './pages/ApiTokensPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import CharacterEditPage from './pages/CharacterEditPage';
import CharactersPage from './pages/CharactersPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MapsPage from './pages/MapsPage';
import MapViewPage from './pages/MapViewPage';
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
          { path: '/characters/:id/edit', element: <CharacterEditPage /> },
          { path: '/maps', element: <MapsPage /> },
          { path: '/maps/:id', element: <MapViewPage /> },
          { path: '/tokens', element: <ApiTokensPage /> },
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
