import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireGuest } from './features/auth';
import ApiTokensPage from './pages/ApiTokensPage';
import BookmarksPage from './pages/BookmarksPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import CharacterEditPage from './pages/CharacterEditPage';
import CharactersPage from './pages/CharactersPage';
import CharacterViewPage from './pages/CharacterViewPage';
import HomePage from './pages/HomePage';
import ItemCreatePage from './pages/ItemCreatePage';
import ItemEditPage from './pages/ItemEditPage';
import ItemsPage from './pages/ItemsPage';
import ItemViewPage from './pages/ItemViewPage';
import LoginPage from './pages/LoginPage';
import MapsPage from './pages/MapsPage';
import MapViewPage from './pages/MapViewPage';
import {
  MonsterCreatePage,
  MonsterEditPage,
  MonsterListPage,
  MonsterViewPage,
} from './features/monsters';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import {
  ABILITIES,
  EFFECTS,
  SimpleCreatePage,
  SimpleEditPage,
  SimpleListPage,
  SimpleViewPage,
  type SimpleCatalogDef,
} from './features/simpleCatalog';

// Маршруты раздела справочника со способностями или эффектами. key — по разделу: у
// разделов одни и те же компоненты, и без ключа React перенёс бы состояние страницы
// способностей на страницу эффектов.
function simpleCatalogRoutes(def: SimpleCatalogDef) {
  const key = def.section;
  return [
    { path: def.path, element: <SimpleListPage key={key} def={def} /> },
    {
      path: `${def.path}/new`,
      element: <SimpleCreatePage key={key} def={def} />,
    },
    {
      path: `${def.path}/:id`,
      element: <SimpleViewPage key={key} def={def} />,
    },
    {
      path: `${def.path}/:id/edit`,
      element: <SimpleEditPage key={key} def={def} />,
    },
  ];
}

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
          { path: '/characters/:id', element: <CharacterViewPage /> },
          { path: '/characters/:id/edit', element: <CharacterEditPage /> },
          { path: '/items', element: <ItemsPage /> },
          { path: '/items/new', element: <ItemCreatePage /> },
          { path: '/items/:id', element: <ItemViewPage /> },
          { path: '/items/:id/edit', element: <ItemEditPage /> },
          ...simpleCatalogRoutes(ABILITIES),
          ...simpleCatalogRoutes(EFFECTS),
          { path: '/monsters', element: <MonsterListPage /> },
          { path: '/monsters/new', element: <MonsterCreatePage /> },
          { path: '/monsters/:id', element: <MonsterViewPage /> },
          { path: '/monsters/:id/edit', element: <MonsterEditPage /> },
          { path: '/bookmarks', element: <BookmarksPage /> },
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
