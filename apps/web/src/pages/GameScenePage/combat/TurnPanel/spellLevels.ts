import type { SpellSlotLevel, SpellSlots } from 'shared';
import type { TurnTile } from './turnTiles';

export interface SpellLevel {
  // null — заклинание без круга в справочнике.
  level: number | null;
  label: string;
  slot: SpellSlotLevel | undefined;
  tiles: TurnTile[];
}

// Заклинания блока хода подгруппами по кругу (решение Михаила 2026-10-28, вариант А):
// заговоры, потом 1 круг и выше, без круга — в конце. Круг — самого заклинания, а не
// ячейки, которой его применят. Внутри круга порядок листа.
export function spellLevels(
  tiles: readonly TurnTile[],
  slots: SpellSlots | null,
): SpellLevel[] {
  const byLevel = new Map<number | null, TurnTile[]>();
  for (const tile of tiles) {
    if (tile.group !== 'spells') continue;
    const own = byLevel.get(tile.level);
    if (own) own.push(tile);
    else byLevel.set(tile.level, [tile]);
  }
  return [...byLevel]
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([level, own]) => ({
      level,
      label:
        level === null
          ? 'Без круга'
          : level === 0
            ? 'Заговоры'
            : `${level} круг`,
      slot: level ? slots?.[level as keyof SpellSlots] : undefined,
      tiles: own,
    }));
}
