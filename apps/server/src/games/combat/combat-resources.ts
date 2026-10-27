import { inArray } from 'drizzle-orm';
import type { CombatantResources, TurnLimits } from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { characters } from '../../database/schema/index.js';
import type { CombatantRow, LiveCombatant } from './combatant-read.js';

// Ресурсы хода участника (docs/plan/combat.md, этап 4): сколько чего за ход — у героя из
// его листа («За ход»), у монстра и НПС из копии в библиотеке — и сколько потрачено.

export async function turnLimitsOf(
  db: Db,
  combatants: readonly LiveCombatant[],
): Promise<Map<string, TurnLimits>> {
  const ids = combatants.flatMap((c) =>
    c.ref.kind === 'figure' ? [c.ref.characterId] : [],
  );
  const sheets =
    ids.length === 0
      ? []
      : await db
          .select({
            id: characters.id,
            actions: characters.actionCount,
            bonusActions: characters.bonusActionCount,
            reactions: characters.reactionCount,
          })
          .from(characters)
          .where(inArray(characters.id, ids));
  return new Map(
    combatants.flatMap((c): [string, TurnLimits][] => {
      if (c.creature) return [[c.row.id, c.creature.turnActions]];
      const sheet = sheets.find(
        (s) => c.ref.kind === 'figure' && s.id === c.ref.characterId,
      );
      if (!sheet) return [];
      const { actions, bonusActions, reactions } = sheet;
      return [[c.row.id, { actions, bonusActions, reactions }]];
    }),
  );
}

export const resourcesOf = (
  row: CombatantRow,
  limits: TurnLimits,
): CombatantResources => ({
  actions: { max: limits.actions, used: row.actionsUsed },
  bonusActions: { max: limits.bonusActions, used: row.bonusActionsUsed },
  reactions: { max: limits.reactions, used: row.reactionsUsed },
});
