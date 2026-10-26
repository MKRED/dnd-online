import type { Character, GameCreatureSpells } from 'shared';

// Лист НПС для окна экземпляра (замечания после первой партии, 2026-10-26, вариант А): всё
// из копии в библиотеке, а ячейки и отметки «подготовлено» — свои у экземпляра на сцене.
export function npcInstanceSheet(
  record: Character,
  spells: GameCreatureSpells | null,
): Character {
  if (!spells) return record;
  return {
    ...record,
    spellSlots: spells.slots,
    abilities: record.abilities.map((entry) =>
      entry.id in spells.prepared
        ? { ...entry, prepared: spells.prepared[entry.id] }
        : entry,
    ),
  };
}
