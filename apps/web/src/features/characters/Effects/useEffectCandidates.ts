import { useMemo } from 'react';
import type { CharacterEffectEntry, Effect } from 'shared';
import { useAuth } from '../../auth';
import { useCatalogList } from '../../catalog';
import { effectsCatalog } from './effectsApi';
import { effectCandidates } from './effectsView';

const FAILED = 'Не удалось загрузить эффекты';

// Варианты для поиска в окне «Наложить эффект»: «Мои эффекты» и «Каталог». Уже
// наложенные видны, но выбрать их нельзя: эффект на персонаже — один раз.
export function useEffectCandidates(applied: readonly CharacterEffectEntry[]) {
  const { user } = useAuth();
  const mine = useCatalogList(effectsCatalog.list, 'mine', FAILED);
  const catalog = useCatalogList(effectsCatalog.list, 'catalog', FAILED);

  const candidates = useMemo(
    () =>
      mine.entries && catalog.entries && user
        ? effectCandidates(mine.entries, catalog.entries, user.id)
        : null,
    [mine.entries, catalog.entries, user],
  );

  const options = useMemo(() => {
    if (!candidates) return [];
    const taken = new Set(
      applied.flatMap((e) => (e.effect ? [e.effect.id] : [])),
    );
    const option = (effect: Effect, label: string) => ({
      value: effect.id,
      label: taken.has(effect.id) ? `${label} · уже наложен` : label,
      disabled: taken.has(effect.id),
    });
    return [
      {
        group: 'Мои эффекты',
        items: candidates.mine.map((e) => option(e, e.name)),
      },
      {
        group: 'Каталог',
        items: candidates.others.map((e) =>
          option(e, `${e.name} · ${e.authorNickname}`),
        ),
      },
    ].filter((group) => group.items.length > 0);
  }, [candidates, applied]);

  const byId = useMemo(
    () =>
      new Map(
        [...(candidates?.mine ?? []), ...(candidates?.others ?? [])].map(
          (e) => [e.id, e],
        ),
      ),
    [candidates],
  );

  return {
    loaded: candidates !== null,
    options,
    byId,
    error: mine.error ?? catalog.error,
  };
}
