import { ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  combatAttuneProblem,
  combatEquipProblem,
  handChangeCost,
  type HandChangeCost,
  type EquipSlot,
  type GameEquipmentChange,
  type InventoryEntry,
} from 'shared';
import {
  applyAttune,
  applyEquip,
  applyUnequip,
  findEntry,
} from '../../characters/equipment/equipment-writes.js';
import { loadInventory } from '../../characters/inventory/inventory-loader.js';
import { characters } from '../../database/schema/index.js';
import { spendHandChange } from '../combat/combat-hand-swap.js';
import { readMoveMode } from '../figures/move-mode-read.js';
import { appendGameEvent } from '../game-journal.js';
import { actingAs, type SeatedCharacter } from './game-character-access.js';
import type { CharacterActor } from './game-character-state.js';

// Кукла персонажа во время встречи (docs/plan/equipment.md, этап 4): те же правила мест и
// настройки, что на листе, плюс запрет боя — в тактическом режиме доспех и настройку не
// сменить (docs/dnd/weapons-armor.md, «Экипировка в игре»). Пишет лист владельца и
// запись журнала; правила читают инвентарь глазами владельца, как на его листе.
export async function changeEquipment(
  actor: CharacterActor,
  seated: SeatedCharacter,
  change: GameEquipmentChange,
): Promise<void> {
  const { tx } = actor;
  // Блокировка персонажа после игры: вне встречи лист правит и владелец, а он блокирует
  // только персонажа — две правки куклы не должны прочитать одно надетое.
  await tx
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.id, seated.id))
    .for('update');
  const inventory = await loadInventory(tx, seated.ownerId, seated.id);
  const { mode } = await readMoveMode(tx, actor.gameId);
  let item: InventoryEntry | null = null;
  let freed: EquipSlot[] = [];
  let spent: HandChangeCost | null = null;
  // Смена в руке в бою с очерёдностью стоит хода (этап 5 боя): touched — что берут и что
  // при этом уходит из рук.
  const spendHand = async (
    slot: EquipSlot,
    touched: (EquipSlot | InventoryEntry)[],
  ) => {
    const equips = touched.map((t) =>
      typeof t === 'string' ? wornAt(inventory, t) : (t.item?.equip ?? null),
    );
    spent = await spendHandChange(
      tx,
      actor.gameId,
      actor,
      seated.id,
      (swapped) => handChangeCost(slot, equips, swapped),
    );
  };
  switch (change.kind) {
    case 'equip': {
      item = findEntry(inventory, change.entryId);
      // Нельзя ни надеть доспех, ни снять его, заменив другой вещью на том же месте.
      refuse(
        combatEquipProblem(mode, item.item?.equip ?? null) ??
          combatEquipProblem(mode, wornAt(inventory, change.slot)),
      );
      await spendHand(change.slot, [item, change.slot]);
      ({ freed } = await applyEquip(
        tx,
        seated.id,
        inventory,
        change.slot,
        change.entryId,
      ));
      break;
    }
    case 'unequip':
      item = inventory.find((e) => e.equipped.includes(change.slot)) ?? null;
      refuse(combatEquipProblem(mode, wornAt(inventory, change.slot)));
      await spendHand(change.slot, [change.slot]);
      await applyUnequip(tx, seated.id, change.slot);
      break;
    case 'attune':
    case 'end_attunement':
      item = findEntry(inventory, change.entryId);
      refuse(combatAttuneProblem(mode));
      await applyAttune(
        tx,
        inventory,
        change.entryId,
        change.kind === 'attune',
      );
      break;
  }
  await appendGameEvent(tx, actor.gameId, {
    kind: 'character.equipment',
    actorId: actor.userId,
    as: actingAs(actor.userId, actor.masterId, seated.id),
    intent: { characterId: seated.id, change },
    result: {
      character: { id: seated.id, name: seated.name },
      item: item?.item ? { id: item.item.id, name: item.item.name } : null,
      freed,
      spent,
    },
  });
}

function wornAt(inventory: readonly InventoryEntry[], slot: EquipSlot) {
  return inventory.find((e) => e.equipped.includes(slot))?.item?.equip ?? null;
}

function refuse(problem: string | null): void {
  if (problem) throw new ConflictException(problem);
}
