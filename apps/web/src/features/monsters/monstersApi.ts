import type { Monster, MonsterInput } from 'shared';
import { catalogApi } from '../catalog';

// Запросы каталога монстров — общие маршруты справочника (docs/plan/done/monsters-npcs.md, «API»).
export const monstersApi = catalogApi<Monster, MonsterInput>('/monsters');

// Байты файла 3D-модели монстра (docs/plan/done/monster-models.md): id модели в адресе —
// сервер сверяет его со ссылкой монстра, версия — чтобы кешировать навсегда.
export const monsterModelPath = (
  monsterId: string,
  modelId: string,
  version: number,
) => `/monsters/${monsterId}/models/${modelId}/file?v=${version}`;

// Тексты ошибок загрузки — постоянный объект: useCatalogEntry перезапускает загрузку
// при новом.
export const MONSTER_LOAD_TEXTS = {
  notFound: 'Монстр не найден',
  failed: 'Не удалось загрузить монстра',
};
