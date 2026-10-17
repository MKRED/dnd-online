import { getAbilityModifier } from './abilityModifier.js';
import { expandConditions } from './conditionsExpand.js';
import type { ArmorClassDetails } from './effectArmorClass.js';
import type { AppliedEffect } from './effectSpeedTotal.js';

// Итоговый Класс доспеха по базе и наложенным эффектам (правила —
// docs/dnd/combining-effects.md). База — число формы: КД персонажа без эффектов, уже
// с доспехом и щитом.
export type ArmorClassBase = { armorClass: number; dexterity: number };

// Одно заклинание дважды не складывается — от записи каталога действует один экземпляр,
// последний (как у Скорости). Состояния раскрываются, хотя КД сейчас не меняет ни одно.
function armorClassChanges(
  effects: readonly AppliedEffect[],
): ArmorClassDetails[] {
  const bySource = new Map<string, AppliedEffect>();
  for (const effect of expandConditions(effects)) {
    bySource.set(effect.source, effect);
  }
  return [...bySource.values()].flatMap((effect) =>
    effect.components.flatMap((c) => (c.kind === 'armor_class' ? [c] : [])),
  );
}

// Порядок решён с пользователем 2026-10-17:
// 1. база — большее из числа формы и баз эффектов («N + модификатор Ловкости»): по книге
//    из нескольких способов расчёта игрок выбирает один, и выгоднее больший;
// 2. все бонусы и штрафы складываются: Haste и Slow вместе дают 0;
// 3. «не ниже N» — последним, по итогу: «КД 17, если он ниже» у Barkskin.
export function totalArmorClass(
  base: ArmorClassBase,
  effects: readonly AppliedEffect[],
): number {
  const changes = armorClassChanges(effects);
  const dex = getAbilityModifier(base.dexterity);
  let armorClass = base.armorClass;
  for (const { change, value } of changes) {
    if (change === 'base') armorClass = Math.max(armorClass, value + dex);
  }
  for (const { change, value } of changes) {
    if (change === 'bonus') armorClass += value;
    if (change === 'penalty') armorClass -= value;
  }
  for (const { change, value } of changes) {
    if (change === 'minimum') armorClass = Math.max(armorClass, value);
  }
  return armorClass;
}
