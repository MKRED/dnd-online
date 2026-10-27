import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  getAbilityModifier,
  initiativeFromSheet,
  rollD20,
  type D20Roll,
  type D20RollInput,
  type RollMode,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { characters } from '../../database/schema/index.js';
import { loadGameEffectLists } from '../characters/game-character-effects.js';
import { loadGameTraitLists } from '../characters/game-character-traits.js';
import { loadCreatureEffects } from '../creatures/creature-read.js';
import type { LiveCombatant } from './combatant-read.js';

// Бросок инициативы участника на сервере (docs/plan/combat.md, «Окно броска»): модификатор
// и эффекты — как на листе в игре, кости — криптостойкие: бросок честный и для мастера.

// Число в [0, 1) из криптостойкого генератора, как Math.random.
export const fairRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

// Что входит в бросок участника и его модификатор инициативы (для ничьих).
export async function initiativeInputOf(
  tx: Db,
  gameId: string,
  sceneId: string,
  c: LiveCombatant,
): Promise<{ input: Omit<D20RollInput, 'master'>; modifier: number }> {
  const surprised = c.row.surprised;
  if (c.figure && c.ref.kind === 'figure') {
    const id = c.ref.characterId;
    const [row] = await tx
      .select({ dexterity: characters.dexterity })
      .from(characters)
      .where(eq(characters.id, id));
    const owners = new Map([[id, c.figure.ownerId]]);
    const effects = await loadGameEffectLists(tx, gameId, owners);
    const traits = await loadGameTraitLists(tx, owners);
    const modifier = getAbilityModifier(row.dexterity);
    const input = initiativeFromSheet(
      { label: 'Ловкость', modifier },
      effects.get(id) ?? [],
      traits.get(id) ?? [],
      surprised,
    );
    return { input, modifier };
  }
  const creature = c.creature!;
  const effects = await loadCreatureEffects(tx, gameId, sceneId);
  const modifier = creature.initiative;
  // У монстра число из стат-блока — «Инициатива», у НПС — Ловкость листа.
  const label = creature.kind === 'monster' ? 'Инициатива' : 'Ловкость';
  const input = initiativeFromSheet(
    { label, modifier },
    effects.get(creature.objectId) ?? [],
    [],
    surprised,
  );
  return { input, modifier };
}

export async function rollInitiative(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
  c: LiveCombatant,
  master: RollMode | null,
): Promise<{ roll: D20Roll; modifier: number }> {
  const { input, modifier } = await initiativeInputOf(tx, gameId, sceneId, c);
  return { roll: rollD20({ ...input, master }, fairRandom), modifier };
}
