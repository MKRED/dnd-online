import { BadRequestException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  applyHitPoints,
  creatureTotals,
  type GameCharacterChange,
  type GameCharacterState,
} from 'shared';
import { spentSpellSlots } from '../../characters/character-spell-slots.js';
import type { DbTransaction } from '../../database/database.service.js';
import { characters } from '../../database/schema/index.js';
import { CHARACTER_DEAD, characterNoHealing } from '../game-errors.js';
import { appendGameEvent } from '../game-journal.js';
import { actingAs, type SeatedCharacter } from './game-character-access.js';
import { loadGameEffectLists } from './game-character-effects.js';

type CharacterRow = typeof characters.$inferSelect;

export interface CharacterActor {
  tx: DbTransaction;
  gameId: string;
  userId: string;
  masterId: string;
}

// Правка хитов, спасбросков или ячеек персонажа в игре (docs/plan/game.md, этап 8): пишет
// лист владельца и запись журнала. Закрытость листа не проверяется — ради этой правки
// лист и закрыт на время встречи. Вызывать в транзакции, которая взяла lockGame: строка
// персонажа блокируется после игры — порядок «игра → персонаж», как у всех правок игры.
export async function changeCharacter(
  actor: CharacterActor,
  seated: SeatedCharacter,
  change: GameCharacterChange,
): Promise<void> {
  const { tx } = actor;
  const [row] = await tx
    .select()
    .from(characters)
    .where(eq(characters.id, seated.id))
    .for('update');
  const before = stateOf(row);
  let instantDeath = false;
  let values: Partial<CharacterRow>;
  if (change.kind === 'spell_slots') {
    values = { spellSlots: spentSpellSlots(row.spellSlots, change.expended) };
  } else {
    if (change.kind === 'heal') await assertCanHeal(actor, row);
    const outcome = applyHitPoints(hitPointsOf(row), change, true);
    if (!outcome.ok) throw new ConflictException(CHARACTER_DEAD);
    instantDeath = outcome.instantDeath;
    values = {
      hitPointsCurrent: outcome.state.current,
      hitPointsTemp: outcome.state.temp,
      deathSaveSuccesses: outcome.state.deathSuccesses,
      deathSaveFailures: outcome.state.deathFailures,
    };
  }
  const [updated] = await tx
    .update(characters)
    .set(values)
    .where(eq(characters.id, seated.id))
    .returning();
  await appendGameEvent(tx, actor.gameId, {
    kind: 'character.changed',
    actorId: actor.userId,
    as: actingAs(actor.userId, actor.masterId, seated.id),
    intent: { characterId: seated.id, change },
    result: {
      character: { id: seated.id, name: seated.name },
      before,
      after: stateOf(updated),
      instantDeath,
    },
  });
}

// Эффект «Запрет лечения» (Chill Touch) на персонаже — лечение отклоняется с его именем.
async function assertCanHeal(actor: CharacterActor, row: CharacterRow) {
  const lists = await loadGameEffectLists(
    actor.tx,
    actor.gameId,
    new Map([[row.id, row.userId]]),
  );
  const { noHealing } = creatureTotals(
    {
      speed: { speed: row.speed },
      armorClass: row.armorClass,
      dexterity: row.dexterity,
    },
    lists.get(row.id) ?? [],
  );
  if (noHealing.length > 0) {
    throw new BadRequestException(characterNoHealing(noHealing));
  }
}

function hitPointsOf(row: CharacterRow) {
  return {
    current: row.hitPointsCurrent,
    max: row.hitPointsMax,
    temp: row.hitPointsTemp,
    deathSuccesses: row.deathSaveSuccesses,
    deathFailures: row.deathSaveFailures,
  };
}

function stateOf(row: CharacterRow): GameCharacterState {
  return {
    hitPointsCurrent: row.hitPointsCurrent,
    hitPointsMax: row.hitPointsMax,
    hitPointsTemp: row.hitPointsTemp,
    deathSaveSuccesses: row.deathSaveSuccesses,
    deathSaveFailures: row.deathSaveFailures,
    spellSlots: row.spellSlots,
  };
}
