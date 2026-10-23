import { useEffect, useState } from 'react';
import type {
  Bookmark,
  Character,
  GameDetail,
  GameListItem,
  MapListItem,
} from 'shared';
import { listBookmarks } from '../../features/bookmarks';
import { listCharacters } from '../../features/characters';
import { getGame, listGames } from '../../features/games';
import { listMaps } from '../../features/maps';
import { myGames } from './homeSummary';

export interface HomeData {
  // null — не загрузилось: блок прячется, а ошибка собрана в errors.
  games: GameListItem[] | null;
  characters: Character[] | null;
  maps: MapListItem[] | null;
  bookmarks: Bookmark[] | null;
  // Подробности своих игр: места с персонажами и активная сцена. Отдельного маршрута
  // ленты нет — главная собирается из тех же ответов, что и разделы.
  details: GameDetail[];
  errors: string[];
}

const SOURCES = ['игры', 'персонажей', 'карты', 'закладки'] as const;

// Загрузка главной: четыре списка разом, затем подробности своих игр. Один упавший
// список не роняет страницу — остальные блоки показываются.
export function useHomeData(): { data: HomeData | null } {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        listGames(),
        listCharacters(),
        listMaps(),
        listBookmarks(),
      ]);
      const errors: string[] = [];
      const value = <T>(r: PromiseSettledResult<T>, i: number): T | null => {
        if (r.status === 'fulfilled') return r.value;
        console.error(`Home: failed to load ${SOURCES[i]}`, r.reason);
        errors.push(SOURCES[i]);
        return null;
      };
      const games = value(results[0], 0);
      const characters = value(results[1], 1);
      const maps = value(results[2], 2);
      const bookmarks = value(results[3], 3);

      // Подробности нужны только для украшений (сцена, кто где сидит): если какая-то
      // не пришла, строка игры остаётся без них.
      const settled = await Promise.allSettled(
        myGames(games ?? []).map((g) => getGame(g.id)),
      );
      const details: GameDetail[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') details.push(r.value);
        else console.error('Home: failed to load game detail', r.reason);
      }
      if (!cancelled) {
        setData({ games, characters, maps, bookmarks, details, errors });
      }
    })().catch((err: unknown) => {
      // Сюда не дойти: allSettled не бросает. Но страница не должна висеть на загрузке.
      console.error('Home: failed to load', err);
      if (!cancelled) {
        setData({
          games: null,
          characters: null,
          maps: null,
          bookmarks: null,
          details: [],
          errors: [...SOURCES],
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data };
}
