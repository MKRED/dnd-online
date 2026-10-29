import type { CombatEntry } from './combatEntries';

// Что полоса очерёдности умеет сделать с участником; страница сцены даёт это из боя.
export interface StripActions {
  focus: (entry: CombatEntry) => void;
  roll: (entry: CombatEntry) => void;
  pass: (id: string) => void;
  move: (id: string, step: -1 | 1) => void;
  edit: (entry: CombatEntry, what: 'initiative' | 'remove') => void;
}
