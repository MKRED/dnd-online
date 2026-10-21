import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { visibleEntry } from '../../catalog/catalog-access.js';
import {
  CHARACTER_EFFECT_ALREADY,
  CHARACTER_EFFECT_ENTRY_NOT_FOUND,
  CHARACTER_EFFECT_NOT_FOUND,
} from '../../characters/effects/character-effects.messages.js';
import {
  characterEffects,
  effects,
  gameLibrary,
} from '../../database/schema/index.js';
import { EFFECT_ACCESS } from '../../effects/effects.config.js';
import { appendGameEvent } from '../game-journal.js';
import { copyToLibrary } from '../library/index.js';
import { actingAs, type SeatedCharacter } from './game-character-access.js';
import type { CharacterActor } from './game-character-state.js';

// Наложить и снять эффект персонажа в игре (docs/plan/done/game.md, этап 8). Строка — та же
// ссылка в листе владельца, что и на его странице; игра читает эффект из библиотеки.
// Наложенный в игре эффект сразу копируется туда глазами того, кто накладывает: мастер
// может наложить свой скрытый эффект, игрок — только то, что видит.

export async function addCharacterEffect(
  actor: CharacterActor,
  seated: SeatedCharacter,
  effectId: string,
): Promise<void> {
  const { tx } = actor;
  const [effect] = await tx
    .select({ id: effects.id, name: effects.name })
    .from(effects)
    .where(visibleEntry(EFFECT_ACCESS, actor.userId, effectId))
    .limit(1);
  if (!effect) throw new BadRequestException(CHARACTER_EFFECT_NOT_FOUND);
  const inserted = await tx
    .insert(characterEffects)
    .values({
      characterId: seated.id,
      effectId: effect.id,
      sourceEffectId: effect.id,
    })
    .onConflictDoNothing()
    .returning({ id: characterEffects.id });
  if (inserted.length === 0) {
    throw new ConflictException(CHARACTER_EFFECT_ALREADY);
  }
  const libraryCopied = await copyToLibrary(tx, actor.gameId, actor.userId, [
    { kind: 'effect', sourceId: effect.id },
  ]);
  await appendGameEvent(tx, actor.gameId, {
    kind: 'character.effect_added',
    actorId: actor.userId,
    as: actingAs(actor.userId, actor.masterId, seated.id),
    intent: { characterId: seated.id, effectId },
    result: {
      character: { id: seated.id, name: seated.name },
      effect,
      libraryCopied,
    },
  });
}

// Снять можно любую строку, и ту, чьей записи уже нет в справочнике.
export async function removeCharacterEffect(
  actor: CharacterActor,
  seated: SeatedCharacter,
  entryId: string,
): Promise<void> {
  const { tx } = actor;
  const [row] = await tx
    .delete(characterEffects)
    .where(
      and(
        eq(characterEffects.id, entryId),
        eq(characterEffects.characterId, seated.id),
      ),
    )
    .returning({ effectId: characterEffects.sourceEffectId });
  if (!row) throw new NotFoundException(CHARACTER_EFFECT_ENTRY_NOT_FOUND);
  await appendGameEvent(tx, actor.gameId, {
    kind: 'character.effect_removed',
    actorId: actor.userId,
    as: actingAs(actor.userId, actor.masterId, seated.id),
    intent: { characterId: seated.id, entryId },
    result: {
      character: { id: seated.id, name: seated.name },
      effect: row.effectId ? await effectName(actor, row.effectId) : null,
    },
  });
}

// Имя для журнала — из библиотеки игры, а если копии нет — из справочника.
async function effectName(actor: CharacterActor, effectId: string) {
  const [copy] = await actor.tx
    .select({ name: gameLibrary.name })
    .from(gameLibrary)
    .where(
      and(
        eq(gameLibrary.gameId, actor.gameId),
        eq(gameLibrary.kind, 'effect'),
        eq(gameLibrary.sourceId, effectId),
      ),
    );
  const [source] = copy
    ? [copy]
    : await actor.tx
        .select({ name: effects.name })
        .from(effects)
        .where(eq(effects.id, effectId));
  return source ? { id: effectId, name: source.name } : null;
}
