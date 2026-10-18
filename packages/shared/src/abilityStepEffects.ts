import type { CatalogImage } from './catalogImage.js';

// Эффекты в исходах шага (docs/plan/done/abilities.md, этап 8): ссылки на записи каталога
// эффектов, как предметы в составе набора. Ложатся на тех, кого задел исход: при
// попадании или провале — на цель, при промахе или успехе — на неё же. Сл снятия
// спасброском даёт шаг (docs/dnd/attacks-and-saves.md).

// Краткая карточка эффекта — чтобы показать строку без отдельного запроса.
export interface StepEffectRef {
  name: string;
  isPublic: boolean;
  image: CatalogImage | null;
}

// В запросе — только effectId. В ответе сервер добавляет effect: null — автор эффекта
// скрыл его от читателя; удалённый эффект пропадает из шага сам.
export interface StepEffect {
  effectId: string;
  effect?: StepEffectRef | null;
}

// В книге больше двух на исход не нашлось («Ошеломляющий удар»), пять — с запасом.
export const STEP_EFFECTS_MAX = 5;

// Какие способности накладывают эффект — автору эффекта для подтверждения удаления и
// скрытия. Чужие — числом: их названия могут быть скрыты.
export interface EffectAbilityRef {
  id: string;
  name: string;
  isPublic: boolean;
}

export interface EffectAbilities {
  mine: EffectAbilityRef[];
  othersCount: number;
}

// Id эффектов шага по исходам — то, что сервер пишет в таблицу связей.
export interface StepEffectLink {
  step: number;
  outcome: 'hit' | 'miss';
  effectId: string;
}

export function stepEffectLinks(
  steps: readonly {
    hit: { effects: readonly StepEffect[] };
    miss: { effects: readonly StepEffect[] };
  }[],
): StepEffectLink[] {
  return steps.flatMap((step, index) =>
    (['hit', 'miss'] as const).flatMap((outcome) =>
      step[outcome].effects.map(({ effectId }) => ({
        step: index,
        outcome,
        effectId,
      })),
    ),
  );
}

// Эффекты в шагах — без строки «effect»: её строит сервер при чтении, а в базе шагов
// (extra.steps) эффектов нет вовсе — они в таблице связей.
export function withoutStepEffects<
  S extends { hit: { effects: unknown }; miss: { effects: unknown } },
>(step: S): S {
  return {
    ...step,
    hit: { ...step.hit, effects: [] },
    miss: { ...step.miss, effects: [] },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Строгая проверка списка из запроса: только effectId, каждый эффект — один раз.
export function isStepEffects(value: unknown): value is StepEffect[] {
  if (!Array.isArray(value) || value.length > STEP_EFFECTS_MAX) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item))
      return false;
    const keys = Object.keys(item);
    const { effectId } = item as Record<string, unknown>;
    if (keys.length !== 1 || typeof effectId !== 'string') return false;
    if (!UUID.test(effectId) || ids.has(effectId)) return false;
    ids.add(effectId);
  }
  return true;
}
