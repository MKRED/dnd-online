import {
  SPELL_SLOT_CIRCLES,
  type GameCreatureSpells,
  type SpellSlots,
  type SpellSlotsExpended,
} from 'shared';
import type { SceneCreature } from './creature-read.js';

// Ячейки экземпляра НПС (замечания после первой партии, 2026-10-26, вариант А): число —
// из копии в библиотеке, потрачено — своё у экземпляра; своего нет — как в копии.
// Обновлённая копия могла убавить ячеек — потрачено не больше, чем есть.
export function instanceSlots(
  slots: SpellSlots,
  expended: SpellSlotsExpended | null | undefined,
): SpellSlots {
  const result: SpellSlots = {};
  for (const level of SPELL_SLOT_CIRCLES) {
    const slot = slots[level];
    if (!slot) continue;
    result[level] = {
      total: slot.total,
      expended: Math.min(expended?.[level] ?? slot.expended, slot.total),
    };
  }
  return result;
}

// Ячейки и подготовка экземпляра для мастера; у монстра — null.
export function creatureSpells(
  creature: Pick<SceneCreature, 'slots'>,
  row:
    | {
        spellSlotsExpended: SpellSlotsExpended | null;
        prepared: Record<string, boolean>;
      }
    | undefined,
): GameCreatureSpells | null {
  if (!creature.slots) return null;
  return {
    slots: instanceSlots(creature.slots, row?.spellSlotsExpended),
    prepared: row?.prepared ?? {},
  };
}

// Потраченные экземпляра по кругам — то, что хранит его строка.
export function expendedOf(slots: SpellSlots): SpellSlotsExpended {
  return Object.fromEntries(
    SPELL_SLOT_CIRCLES.filter((level) => slots[level]).map((level) => [
      level,
      slots[level]!.expended,
    ]),
  );
}
