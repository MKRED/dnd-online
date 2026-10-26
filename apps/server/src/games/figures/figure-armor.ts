import { ARMOR_SPEED_PENALTY, armorSpeedPenalty, wornGear } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { loadInventories } from '../../characters/inventory/inventory-loader.js';

// Насколько надетый доспех снижает Скорость фигурки: Силы меньше, чем требует доспех
// (docs/dnd/weapons-armor.md, «Числа от экипировки»). Инвентарь — глазами владельца, как
// на его листе: скрытый от него предмет не действует.
export async function armorSpeedPenalties(
  db: Db,
  rows: readonly { id: string; ownerId: string; strength: number }[],
): Promise<Map<string, number>> {
  const byOwner = new Map<string, string[]>();
  for (const row of rows) {
    byOwner.set(row.ownerId, [...(byOwner.get(row.ownerId) ?? []), row.id]);
  }
  const result = new Map<string, number>();
  for (const [ownerId, ids] of byOwner) {
    const inventories = await loadInventories(db, ownerId, ids);
    for (const row of rows.filter((r) => r.ownerId === ownerId)) {
      const gear = wornGear(inventories.get(row.id) ?? []);
      const penalty = armorSpeedPenalty(gear, row.strength);
      result.set(row.id, penalty ? ARMOR_SPEED_PENALTY : 0);
    }
  }
  return result;
}
