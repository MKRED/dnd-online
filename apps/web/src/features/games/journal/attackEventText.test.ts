import { describe, expect, it } from 'vitest';
import type { D20Roll, GameEvent } from 'shared';
import { attackEventText } from './attackEventText';
import { equipmentEventText } from './characterEventText';
import { gameEventText } from './gameEventText';

const base = {
  seq: 1,
  actor: { id: 'u1', nickname: 'Аня' },
  as: null,
  sceneId: 's1',
  visibility: 'players' as const,
  createdAt: '2026-10-28T10:00:00.000Z',
};
const lira = {
  id: 'b1',
  name: 'Лира',
  ref: { kind: 'figure' as const, characterId: 'c1' },
};
const sword = { key: 'meleeMain' as const, name: 'Длинный меч' };
const goblin = {
  ref: { kind: 'creature' as const, objectId: 2 },
  name: 'Гоблин',
};
const roll: D20Roll = {
  dice: [12],
  kept: 0,
  mode: 'normal',
  reasons: { advantage: [], disadvantage: [] },
  master: null,
  terms: [{ kind: 'number', label: 'Сила', amount: 3 }],
  total: 15,
};

const attack: Extract<GameEvent, { kind: 'combat.attack' }> = {
  ...base,
  kind: 'combat.attack',
  intent: {
    combatantId: 'b1',
    attack: 'meleeMain',
    target: goblin.ref,
    mode: null,
  },
  result: {
    combatant: lira,
    attack: sword,
    target: goblin,
    roll,
    cover: 'half',
    armorClass: 14,
    outcome: 'hit',
    spent: 'action',
  },
};

describe('журнал атаки', () => {
  it('бросок атаки: мастеру с КД, глазами игроков — без него', () => {
    expect(gameEventText(attack)).toBe(
      'Атака: Лира — Длинный меч → Гоблин: 15 против КД 14 — попадание, укрытие ½ (к20: 12; Сила +3)',
    );
    expect(attackEventText(attack, 'players')).toBe(
      'Атака: Лира — Длинный меч → Гоблин: 15 — попадание, укрытие ½ (к20: 12; Сила +3)',
    );
  });

  it('урон по типам с защитами и крит', () => {
    const text = gameEventText({
      ...base,
      kind: 'combat.damage',
      intent: { combatantId: 'b1' },
      result: {
        combatant: lira,
        attack: sword,
        target: goblin,
        applied: true,
        damage: {
          critical: true,
          terms: [
            {
              kind: 'dice',
              label: 'Длинный меч',
              count: 2,
              die: 8,
              sign: 1,
              rolls: [8, 6],
              amount: 14,
              type: 'slashing',
            },
          ],
          byType: [
            {
              type: 'slashing',
              rolled: 14,
              dealt: 7,
              defenses: ['resistance'],
            },
          ],
          total: 7,
        },
      },
    });
    expect(text).toBe(
      'Урон атаки: Лира — Длинный меч → Гоблин: 7 рубящий (из 14, сопротивление), крит (Длинный меч +2к8 (8, 6))',
    );
  });

  it('набор оружия и цена смены в руке', () => {
    expect(
      gameEventText({
        ...base,
        kind: 'combat.weapon_set',
        intent: { combatantId: 'b1', set: 'ranged' },
        result: { combatant: lira, set: 'ranged' },
      }),
    ).toBe('Набор оружия: Лира — Дальний');
    expect(
      equipmentEventText({
        intent: {
          characterId: 'c1',
          change: { kind: 'unequip', slot: 'meleeMain' },
        },
        result: {
          character: { id: 'c1', name: 'Лира' },
          item: { id: 'i1', name: 'Кинжал' },
          freed: [],
          spent: 'action',
        },
      }),
    ).toBe('Снято: Лира — Кинжал (основная рука, ближний бой), за действие');
  });
});
