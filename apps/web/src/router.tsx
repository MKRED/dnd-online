import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireGuest } from './features/auth';
import ApiTokensPage from './pages/ApiTokensPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import CharacterEditPage from './pages/CharacterEditPage';
import CharactersPage from './pages/CharactersPage';
import HomePage from './pages/HomePage';
import ItemCreatePage from './pages/ItemCreatePage';
import ItemEditPage from './pages/ItemEditPage';
import ItemsPage from './pages/ItemsPage';
import ItemViewPage from './pages/ItemViewPage';
import LoginPage from './pages/LoginPage';
import MapsPage from './pages/MapsPage';
import MapViewPage from './pages/MapViewPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
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
          { path: '/items', element: <ItemsPage /> },
          { path: '/items/new', element: <ItemCreatePage /> },
          { path: '/items/:id', element: <ItemViewPage /> },
          { path: '/items/:id/edit', element: <ItemEditPage /> },
          { path: '/maps', element: <MapsPage /> },
          { path: '/maps/:id', element: <MapViewPage /> },
          { path: '/tokens', element: <ApiTokensPage /> },
          { path: '/profile', element: <ProfilePage /> },
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
