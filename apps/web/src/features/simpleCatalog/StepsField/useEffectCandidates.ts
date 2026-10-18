import { useMemo } from 'react';
import type { Effect, EffectInput } from 'shared';
import { useAuth } from '../../auth';
import { catalogApi, useCatalogList } from '../../catalog';
import { effectCandidates, type EffectCandidates } from './effectOptions';

// Свой запрос, а не EFFECTS из simpleCatalogs: тот через поля раздела импортирует эту
// форму — вышел бы круг импортов. Функция модуля — useCatalogList ждёт постоянную.
const effectsApi = catalogApi<Effect, EffectInput>('/effects');
const FAILED = 'Не удалось загрузить эффекты';

// Эффекты для выбора в шагах — те же списки «Мои» и «Каталог», что на странице эффектов.
// Грузится один раз на форму, а не в каждом исходе.
export function useEffectCandidates(): {
  candidates: EffectCandidates | null;
  error: string | null;
} {
  const { user } = useAuth();
  const mine = useCatalogList(effectsApi.list, 'mine', FAILED);
  const catalog = useCatalogList(effectsApi.list, 'catalog', FAILED);
  const candidates = useMemo(
    () =>
      mine.entries && catalog.entries && user
        ? effectCandidates(mine.entries, catalog.entries, user.id)
        : null,
    [mine.entries, catalog.entries, user],
  );
  return { candidates, error: mine.error ?? catalog.error };
}
