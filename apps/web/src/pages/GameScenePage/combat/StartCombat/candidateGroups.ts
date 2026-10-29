import type { CombatCandidate } from 'shared';
import type { CombatLook } from '../TurnStrip';

export type CandidateRow = CombatCandidate & { key: string; look: CombatLook };

export const candidateKey = (c: CombatCandidate) =>
  c.kind === 'figure' ? `f:${c.characterId}` : `c:${c.objectId}`;

const GROUPS = [
  { kind: 'pc', title: 'Герои' },
  { kind: 'npc', title: 'НПС' },
  { kind: 'monster', title: 'Существа' },
] as const;

// Кандидаты в бой группами, как во вкладке «Участники»: герои, НПС, существа; пустые
// группы не показываются.
export function candidateGroups(rows: readonly CandidateRow[]) {
  return GROUPS.map((group) => ({
    ...group,
    rows: rows.filter((row) => row.look.kind === group.kind),
  })).filter((group) => group.rows.length > 0);
}
