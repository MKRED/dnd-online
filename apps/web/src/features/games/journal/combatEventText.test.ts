import { describe, expect, it } from 'vitest';
import type { D20Roll, GameEvent } from 'shared';
import { gameEventText } from './gameEventText';
import { rollText } from './combatEventText';

const base = {
  seq: 1,
  actor: { id: 'u1', nickname: 'Аня' },
  as: null,
  sceneId: 's1',
  visibility: 'players' as const,
  createdAt: '2026-10-27T10:00:00.000Z',
};
const lira = {
  id: 'b1',
  name: 'Лира',
  ref: { kind: 'figure' as const, characterId: 'c1' },
};
const goblin = {
  id: 'b2',
  name: 'Гоблин',
  ref: { kind: 'creature' as const, objectId: 2 },
};

const roll: D20Roll = {
  dice: [7, 15],
  kept: 1,
  mode: 'advantage',
  reasons: { advantage: ['Невидимый'], disadvantage: [] },
  master: null,
  terms: [
    { kind: 'number', label: 'Ловкость', amount: 3 },
    {
      kind: 'dice',
      label: 'Порча',
      count: 1,
      die: 4,
      sign: -1,
      rolls: [2],
      amount: -2,
    },
  ],
  total: 16,
};

describe('combatEventText', () => {
  it('бросок: засчитанная кость, вторая и слагаемые', () => {
    expect(rollText(roll)).toBe(
      'к20: 15 (и 7), преимущество; Ловкость +3; Порча −1к4 (2)',
    );
  });

  it.each<[GameEvent, string]>([
    [
      {
        ...base,
        kind: 'combat.started',
        intent: { count: 3 },
        result: { scene: { id: 's1', name: 'Логово' }, count: 3 },
      },
      'Бой с очерёдностью: участников 3, бросают инициативу',
    ],
    [
      {
        ...base,
        kind: 'combat.initiative',
        intent: { combatantId: 'b1', mode: null },
        result: { combatant: lira, roll, place: 0 },
      },
      'Инициатива: Лира — 16 (к20: 15 (и 7), преимущество; Ловкость +3; Порча −1к4 (2))',
    ],
    [
      {
        ...base,
        kind: 'combat.initiative_set',
        intent: { combatantId: 'b2', initiative: 12 },
        result: { combatant: goblin, before: null, place: 1 },
      },
      'Инициатива поправлена: Гоблин — не брошена → 12',
    ],
    [
      {
        ...base,
        kind: 'combat.turn',
        intent: { reason: 'end', combatantId: 'b1' },
        result: { combatant: lira, from: goblin, round: 2, newRound: true },
      },
      'Раунд 2 · ходит Лира',
    ],
    [
      {
        ...base,
        kind: 'combat.left',
        intent: { combatantId: 'b2' },
        result: { combatant: goblin, turnPassed: true },
      },
      'Из боя: Гоблин, ход перешёл дальше',
    ],
    [
      {
        ...base,
        kind: 'combat.action',
        intent: { combatantId: 'b2', action: 'dodge' },
        result: { combatant: goblin, action: 'dodge', dashes: null },
      },
      'Гоблин: Уклонение',
    ],
    [
      {
        ...base,
        kind: 'combat.ability',
        intent: { combatantId: 'b1', abilityId: 'a1', slotLevel: 2 },
        result: {
          combatant: lira,
          ability: { id: 'a1', name: 'Целительное слово' },
          spent: 'bonus_action',
          slotLevel: 2,
        },
      },
      'Лира: Целительное слово (бонусное действие, ячейка 2 круга)',
    ],
    [
      {
        ...base,
        kind: 'combat.resources',
        intent: { combatantId: 'b1', actionsUsed: 0 },
        result: {
          combatant: lira,
          before: { actionsUsed: 1, bonusActionsUsed: 0, reactionsUsed: 0 },
          after: { actionsUsed: 0, bonusActionsUsed: 0, reactionsUsed: 0 },
        },
      },
      'Потрачено поправлено: Лира — действий 0, бонусных 0, реакций 0',
    ],
  ])('%#', (event, text) => {
    expect(gameEventText(event)).toBe(text);
  });
});
