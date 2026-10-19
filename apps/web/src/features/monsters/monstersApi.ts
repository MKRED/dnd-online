import type { Monster, MonsterInput } from 'shared';
import { catalogApi } from '../catalog';

// Запросы каталога монстров — общие маршруты справочника (docs/plan/monsters-npcs.md, «API»).
export const monstersApi = catalogApi<Monster, MonsterInput>('/monsters');

// Тексты ошибок загрузки — постоянный объект: useCatalogEntry перезапускает загрузку
// при новом.
export const MONSTER_LOAD_TEXTS = {
  notFound: 'Монстр не найден',
  failed: 'Не удалось загрузить монстра',
};
