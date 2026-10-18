import type { Effect, StepEffect } from 'shared';

// Эффекты, которые можно выбрать в исходе шага: свои (и скрытые) и опубликованные чужие —
// те же, что примет сервер (docs/plan/done/abilities.md, этап 8).
export interface EffectCandidates {
  mine: Effect[];
  others: Effect[];
}

// «Каталог» без своих: свои опубликованные уже есть в «Моих».
export function effectCandidates(
  mine: Effect[],
  catalog: Effect[],
  userId: string,
): EffectCandidates {
  return {
    mine,
    others: catalog.filter((effect) => effect.authorId !== userId),
  };
}

// Варианты выбора группами; уже выбранные в этом исходе не предлагаем — сервер отклонил
// бы повтор.
export function effectOptions(
  candidates: EffectCandidates,
  taken: readonly StepEffect[],
) {
  const used = new Set(taken.map((item) => item.effectId));
  const free = (list: Effect[]) => list.filter((e) => !used.has(e.id));
  return [
    {
      group: 'Мои эффекты',
      items: free(candidates.mine).map((e) => ({ value: e.id, label: e.name })),
    },
    {
      group: 'Каталог',
      items: free(candidates.others).map((e) => ({
        value: e.id,
        label: `${e.name} · ${e.authorNickname}`,
      })),
    },
  ].filter((group) => group.items.length > 0);
}

// Выбранный эффект строкой исхода — с той же карточкой, что строит сервер.
export const toStepEffect = (effect: Effect): StepEffect => ({
  effectId: effect.id,
  effect: { name: effect.name, isPublic: effect.isPublic, image: effect.image },
});
