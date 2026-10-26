import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { canBePrepared, type Character, type SpellSlotsExpended } from 'shared';
import { spentSpellSlots } from '../../characters/character-spell-slots.js';
import {
  gameCreatures,
  gameSceneObjects,
} from '../../database/schema/index.js';
import {
  CREATURE_NO_SPELLS,
  CREATURE_SPELL_NOT_FOUND,
} from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import { findLibraryRow, readLibraryEntry } from '../library/library-read.js';
import { findCreature, type CreatureActor } from './creature-edits.js';
import { loadCreatureHitPoints, loadCreatureRows } from './creature-read.js';
import { expendedOf, instanceSlots } from './creature-spell-state.js';

// Ячейки и подготовка заклинаний экземпляра НПС (замечания после первой партии,
// 2026-10-26, вариант А): свои у каждого НПС на сцене, как хиты; копия в библиотеке не
// меняется. У монстра ячеек нет — заклинания в день (docs/dnd/monsters.md).

// Экземпляр, его лист из копии и строка состояния.
async function npcInstance(actor: CreatureActor, objectId: number) {
  const { tx } = actor;
  const creature = await findCreature(actor, objectId);
  const [object] = await tx
    .select()
    .from(gameSceneObjects)
    .where(
      and(
        eq(gameSceneObjects.sceneId, actor.sceneId),
        eq(gameSceneObjects.id, objectId),
      ),
    );
  const row =
    object?.kind === 'npc'
      ? await findLibraryRow(tx, actor.gameId, {
          kind: 'npc',
          sourceId: String(object.fields.characterId),
        })
      : undefined;
  if (!row || !creature.slots)
    throw new BadRequestException(CREATURE_NO_SPELLS);
  const npc = (await readLibraryEntry(tx, row, actor.userId))
    .record as Character;
  const rows = await loadCreatureRows(tx, actor.sceneId);
  const state = rows.find((r) => r.objectId === objectId);
  return { creature, slots: creature.slots, npc, state, rows };
}

// Строка экземпляра появляется с первой правкой: хиты в ней — те, что есть сейчас.
async function saveInstance(
  actor: CreatureActor,
  instance: Awaited<ReturnType<typeof npcInstance>>,
  values: Partial<typeof gameCreatures.$inferInsert>,
) {
  const { creature, rows } = instance;
  const hp = (
    await loadCreatureHitPoints(actor.tx, actor.sceneId, [creature], rows)
  ).get(creature.objectId)!;
  await actor.tx
    .insert(gameCreatures)
    .values({
      sceneId: actor.sceneId,
      objectId: creature.objectId,
      hitPointsCurrent: hp.current,
      hitPointsTemp: hp.temp,
      ...values,
    })
    .onConflictDoUpdate({
      target: [gameCreatures.sceneId, gameCreatures.objectId],
      set: values,
    });
}

const eventCreature = ({
  creature,
}: {
  creature: { objectId: number; name: string };
}) => ({
  objectId: creature.objectId,
  name: creature.name,
});

export async function spendCreatureSlots(
  actor: CreatureActor,
  objectId: number,
  expended: SpellSlotsExpended,
): Promise<void> {
  const instance = await npcInstance(actor, objectId);
  const before = instanceSlots(
    instance.slots,
    instance.state?.spellSlotsExpended,
  );
  const after = spentSpellSlots(before, expended);
  await saveInstance(actor, instance, {
    spellSlotsExpended: expendedOf(after),
  });
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'creature.slots_changed',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.sceneId,
    intent: { objectId, expended },
    result: { creature: eventCreature(instance), before, after },
  });
}

export async function prepareCreatureSpell(
  actor: CreatureActor,
  objectId: number,
  abilityId: string,
  prepared: boolean,
): Promise<void> {
  const instance = await npcInstance(actor, objectId);
  const entry = instance.npc.abilities.find((a) => a.id === abilityId);
  if (!entry?.ability || !canBePrepared(entry.ability)) {
    throw new NotFoundException(CREATURE_SPELL_NOT_FOUND);
  }
  // Храним только отличия от копии: обновлённая копия с той же отметкой их не держит.
  const overrides = { ...(instance.state?.prepared ?? {}) };
  if (prepared === entry.prepared) delete overrides[abilityId];
  else overrides[abilityId] = prepared;
  await saveInstance(actor, instance, { prepared: overrides });
  await appendGameEvent(actor.tx, actor.gameId, {
    kind: 'creature.prepared',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.sceneId,
    intent: { objectId, abilityId, prepared },
    result: {
      creature: eventCreature(instance),
      ability: { id: abilityId, name: entry.ability.name },
    },
  });
}
