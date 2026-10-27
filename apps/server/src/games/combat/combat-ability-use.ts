import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  canBePrepared,
  spendBlock,
  turnSpendOf,
  type SpellSlotCircle,
  type SpellSlots,
  type TurnSpend,
} from 'shared';
import { characters, gameCombatants } from '../../database/schema/index.js';
import { changeCharacter } from '../characters/game-character-state.js';
import { loadCreatureRows } from '../creatures/creature-read.js';
import { creatureSpells } from '../creatures/creature-spell-state.js';
import { spendCreatureSlots } from '../creatures/creature-spells.js';
import { appendGameEvent } from '../game-journal.js';
import { asOf, drives, type CombatActor } from './combat-actor.js';
import { combatantAbilities } from './combat-abilities.js';
import {
  ABILITY_NOT_FOUND,
  ABILITY_NOT_IN_COMBAT,
  ABILITY_NOT_PREPARED,
  ACTION_NOT_YOURS,
  COMBATANT_NOT_FOUND,
  noFreeSlot,
  slotLevelNeeded,
} from './combat-errors.js';
import { turnLimitsOf, resourcesOf } from './combat-resources.js';
import { combatantVisibility } from './combat-visibility.js';
import {
  eventCombatant,
  loadCombat,
  type LiveCombatant,
} from './combatant-read.js';

// «Применить» способность в бою (docs/plan/combat.md, этап 4, вариант Б): тратит действие
// нужного вида и ячейку выбранного круга, пишет запись журнала. Что способность делает,
// мастер отмечает руками; заряды, движение и кость хитов пока не тратятся. У монстра ячеек
// нет, а «N в день» пока не считается.

type UsedColumn = 'actionsUsed' | 'bonusActionsUsed' | 'reactionsUsed';
const USED_COLUMN: Record<Exclude<TurnSpend, 'free'>, UsedColumn> = {
  action: 'actionsUsed',
  bonus_action: 'bonusActionsUsed',
  reaction: 'reactionsUsed',
};

export async function useAbility(
  actor: CombatActor,
  combatantId: string,
  abilityId: string,
  slotLevel: number | null,
) {
  const state = await loadCombat(actor.tx, actor.gameId, actor.scene.id);
  const c = state.combatants.find((x) => x.row.id === combatantId);
  if (!c) throw new NotFoundException(COMBATANT_NOT_FOUND);
  if (!drives(actor, c)) throw new ForbiddenException(ACTION_NOT_YOURS);
  const abilities = await combatantAbilities(
    actor.tx,
    actor.gameId,
    actor.userId,
    c,
  );
  const entry = abilities.find((a) => a.id === abilityId);
  if (!entry) throw new NotFoundException(ABILITY_NOT_FOUND);
  const { ability } = entry;
  const spend = turnSpendOf(ability.activation);
  if (!spend) throw new ConflictException(ABILITY_NOT_IN_COMBAT);
  const limits = (await turnLimitsOf(actor.tx, [c])).get(c.row.id)!;
  const block = spendBlock(
    spend,
    resourcesOf(c.row, limits),
    state.turn === c.row.id,
  );
  if (block) throw new ConflictException(block);
  const level = await slotToSpend(actor, c, entry, slotLevel);

  if (spend !== 'free') {
    const column = USED_COLUMN[spend];
    await actor.tx
      .update(gameCombatants)
      .set({ [column]: c.row[column] + 1 })
      .where(eq(gameCombatants.id, c.row.id));
  }
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'combat.ability',
    actorId: actor.userId,
    as: asOf(actor, c),
    sceneId: actor.scene.id,
    intent: { combatantId, abilityId, slotLevel },
    result: {
      combatant: eventCombatant(c),
      ability: { id: ability.id, name: ability.name },
      spent: spend,
      slotLevel: level,
    },
    visibility: await combatantVisibility(
      actor.tx,
      actor.gameId,
      actor.scene.id,
      c,
    ),
  });
  if (level !== null) await spendSlot(actor, c, level);
}

// Круг ячейки, которую тратит заклинание: не ниже его круга и с свободной ячейкой. У
// неподготовленного заклинания персонажа или НПС — отказ, как по книге. У монстра ячеек нет.
async function slotToSpend(
  actor: CombatActor,
  c: LiveCombatant,
  entry: Awaited<ReturnType<typeof combatantAbilities>>[number],
  slotLevel: number | null,
): Promise<SpellSlotCircle | null> {
  const { ability } = entry;
  if (entry.prepared !== null && canBePrepared(ability)) {
    const prepared =
      c.creature === null
        ? entry.prepared
        : ((await instanceRow(actor, c))?.prepared[entry.id] ?? entry.prepared);
    if (!prepared) throw new ConflictException(ABILITY_NOT_PREPARED);
  }
  const cost = ability.costs.spellSlot;
  if (!cost || c.creature?.kind === 'monster') return null;
  if (slotLevel === null || slotLevel < cost.minLevel) {
    throw new BadRequestException(slotLevelNeeded(cost.minLevel));
  }
  // Круг 1–9 проверил DTO.
  const level = slotLevel as SpellSlotCircle;
  const slot = (await slotsOf(actor, c))[level];
  if (!slot || slot.expended >= slot.total) {
    throw new ConflictException(noFreeSlot(level));
  }
  return level;
}

// Участник без существа — фигурка персонажа.
const characterIdOf = (c: LiveCombatant) =>
  c.ref.kind === 'figure' ? c.ref.characterId : '';

async function instanceRow(actor: CombatActor, c: LiveCombatant) {
  const rows = await loadCreatureRows(actor.tx, actor.scene.id);
  return rows.find((r) => r.objectId === c.creature!.objectId);
}

async function slotsOf(
  actor: CombatActor,
  c: LiveCombatant,
): Promise<SpellSlots> {
  if (c.creature) {
    const spells = creatureSpells(c.creature, await instanceRow(actor, c));
    return spells?.slots ?? {};
  }
  const [row] = await actor.tx
    .select({ slots: characters.spellSlots })
    .from(characters)
    .where(eq(characters.id, characterIdOf(c)));
  return row.slots;
}

// Ячейка тратится той же правкой, что кружки на карточке: лист героя или экземпляр НПС
// и их запись журнала.
async function spendSlot(
  actor: CombatActor,
  c: LiveCombatant,
  level: SpellSlotCircle,
) {
  const expended = ((await slotsOf(actor, c))[level]?.expended ?? 0) + 1;
  if (c.creature) {
    await spendCreatureSlots(
      {
        tx: actor.tx,
        gameId: actor.gameId,
        sceneId: actor.scene.id,
        userId: actor.userId,
      },
      c.creature.objectId,
      { [level]: expended },
    );
    return;
  }
  await changeCharacter(
    actor,
    {
      id: characterIdOf(c),
      name: c.name,
      ownerId: c.figure!.ownerId,
      controllerId: c.figure!.controllerId,
    },
    { kind: 'spell_slots', expended: { [level]: expended } },
  );
}
