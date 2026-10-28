import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  applyHitPoints,
  creatureTotals,
  type GameCreatureChange,
  type GameEventAs,
} from 'shared';
import { visibleEntry } from '../../catalog/catalog-access.js';
import {
  CHARACTER_EFFECT_ALREADY,
  CHARACTER_EFFECT_ENTRY_NOT_FOUND,
  CHARACTER_EFFECT_NOT_FOUND,
} from '../../characters/effects/character-effects.messages.js';
import type { DbTransaction } from '../../database/database.service.js';
import {
  effects,
  gameCreatureEffects,
  gameCreatures,
  gameLibrary,
} from '../../database/schema/index.js';
import { EFFECT_ACCESS } from '../../effects/effects.config.js';
import { CREATURE_NOT_FOUND, characterNoHealing } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import { copyToLibrary } from '../library/index.js';
import { creatureEventVisibility } from './creature-visibility.js';
import {
  loadCreatureEffects,
  loadCreatureHitPoints,
  loadSceneCreatures,
  type SceneCreature,
} from './creature-read.js';

// Правки мастера над монстром или НПС сцены (docs/plan/done/game.md, этап 8). Вызывать в
// транзакции, которая взяла lockGame: она же не даёт двум правкам одного существа
// разойтись.

export interface CreatureActor {
  tx: DbTransaction;
  gameId: string;
  sceneId: string;
  userId: string;
}

export async function findCreature(
  actor: CreatureActor,
  objectId: number,
): Promise<SceneCreature> {
  const [creature] = await loadSceneCreatures(
    actor.tx,
    actor.gameId,
    actor.sceneId,
    objectId,
  );
  if (!creature) throw new NotFoundException(CREATURE_NOT_FOUND);
  return creature;
}

const eventCreature = (creature: SceneCreature) => ({
  objectId: creature.objectId,
  name: creature.name,
});

// as — от чьего имени запись: правка мастера или урон атаки героя (этап 5 боя).
export async function changeCreature(
  actor: CreatureActor,
  objectId: number,
  change: GameCreatureChange,
  as: GameEventAs = { kind: 'master' },
): Promise<void> {
  const { tx } = actor;
  const creature = await findCreature(actor, objectId);
  const hitPoints = await loadCreatureHitPoints(tx, actor.sceneId, [creature]);
  const before = hitPoints.get(objectId)!;
  if (change.kind === 'heal') await assertCanHeal(actor, objectId);
  const outcome = applyHitPoints(
    { ...before, deathSuccesses: 0, deathFailures: 0 },
    change,
    false,
  );
  // Без спасбросков правка хитов всегда проходит (hitPoints.ts).
  if (!outcome.ok) throw new Error(`Hit points refused: ${outcome.reason}`);
  const values = {
    hitPointsCurrent: outcome.state.current,
    hitPointsTemp: outcome.state.temp,
  };
  await tx
    .insert(gameCreatures)
    .values({ sceneId: actor.sceneId, objectId, ...values })
    .onConflictDoUpdate({
      target: [gameCreatures.sceneId, gameCreatures.objectId],
      set: values,
    });
  await appendGameEvent(tx, actor.gameId, {
    kind: 'creature.changed',
    actorId: actor.userId,
    as,
    sceneId: actor.sceneId,
    intent: { objectId, change },
    result: {
      creature: eventCreature(creature),
      before,
      after: {
        current: outcome.state.current,
        max: before.max,
        temp: outcome.state.temp,
      },
    },
    visibility: await creatureEventVisibility(
      tx,
      actor.gameId,
      actor.sceneId,
      creature,
      [creature.at],
    ),
  });
}

// Эффект «Запрет лечения» на экземпляре — лечение отклоняется с его именем.
async function assertCanHeal(actor: CreatureActor, objectId: number) {
  const lists = await loadCreatureEffects(
    actor.tx,
    actor.gameId,
    actor.sceneId,
  );
  const { noHealing } = creatureTotals(
    { speed: { speed: 0 }, armorClass: 10, dexterity: 10 },
    lists.get(objectId) ?? [],
  );
  if (noHealing.length > 0) {
    throw new BadRequestException(characterNoHealing(noHealing));
  }
}

// Эффект — из справочника глазами мастера, сразу в библиотеку игры.
export async function addCreatureEffect(
  actor: CreatureActor,
  objectId: number,
  effectId: string,
): Promise<void> {
  const { tx } = actor;
  const creature = await findCreature(actor, objectId);
  const [effect] = await tx
    .select({ id: effects.id, name: effects.name })
    .from(effects)
    .where(visibleEntry(EFFECT_ACCESS, actor.userId, effectId))
    .limit(1);
  if (!effect) throw new BadRequestException(CHARACTER_EFFECT_NOT_FOUND);
  const inserted = await tx
    .insert(gameCreatureEffects)
    .values({ sceneId: actor.sceneId, objectId, effectId: effect.id })
    .onConflictDoNothing()
    .returning({ id: gameCreatureEffects.id });
  if (inserted.length === 0) {
    throw new ConflictException(CHARACTER_EFFECT_ALREADY);
  }
  const libraryCopied = await copyToLibrary(tx, actor.gameId, actor.userId, [
    { kind: 'effect', sourceId: effect.id },
  ]);
  await appendGameEvent(tx, actor.gameId, {
    kind: 'creature.effect_added',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.sceneId,
    intent: { objectId, effectId },
    result: { creature: eventCreature(creature), effect, libraryCopied },
  });
}

export async function removeCreatureEffect(
  actor: CreatureActor,
  objectId: number,
  entryId: string,
): Promise<void> {
  const { tx } = actor;
  const creature = await findCreature(actor, objectId);
  const [row] = await tx
    .delete(gameCreatureEffects)
    .where(
      and(
        eq(gameCreatureEffects.id, entryId),
        eq(gameCreatureEffects.sceneId, actor.sceneId),
        eq(gameCreatureEffects.objectId, objectId),
      ),
    )
    .returning({ effectId: gameCreatureEffects.effectId });
  if (!row) throw new NotFoundException(CHARACTER_EFFECT_ENTRY_NOT_FOUND);
  const [copy] = await tx
    .select({ name: gameLibrary.name })
    .from(gameLibrary)
    .where(
      and(
        eq(gameLibrary.gameId, actor.gameId),
        eq(gameLibrary.kind, 'effect'),
        eq(gameLibrary.sourceId, row.effectId),
      ),
    );
  await appendGameEvent(tx, actor.gameId, {
    kind: 'creature.effect_removed',
    actorId: actor.userId,
    as: { kind: 'master' },
    sceneId: actor.sceneId,
    intent: { objectId, entryId },
    result: {
      creature: eventCreature(creature),
      effect: copy ? { id: row.effectId, name: copy.name } : null,
    },
  });
}
