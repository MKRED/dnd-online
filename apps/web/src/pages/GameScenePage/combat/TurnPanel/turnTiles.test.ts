import {
  NO_ABILITY_COSTS,
  type AbilityLinkCard,
  type CombatantResources,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { slotsLine } from './slotsLine';
import { spellLevels } from './spellLevels';
import {
  freeSlotLevels,
  turnTiles,
  type TurnKit,
  type TurnState,
} from './turnTiles';

const card = (over: Partial<AbilityLinkCard>): AbilityLinkCard => ({
  id: 'cat',
  name: 'Способность',
  isPublic: true,
  image: null,
  category: 'basic',
  level: null,
  activation: { kind: 'action' },
  costs: NO_ABILITY_COSTS,
  recharge: null,
  passive: [],
  ...over,
});

const spell = (name: string, level: number, over = {}) =>
  card({
    name,
    category: 'spell',
    level,
    costs:
      level > 0
        ? { ...NO_ABILITY_COSTS, spellSlot: { minLevel: level } }
        : NO_ABILITY_COSTS,
    ...over,
  });

const resources = (used: [number, number, number]): CombatantResources => ({
  actions: { max: 1, used: used[0] },
  bonusActions: { max: 1, used: used[1] },
  reactions: { max: 1, used: used[2] },
});

const state = (over: Partial<TurnState> = {}): TurnState => ({
  resources: resources([0, 0, 0]),
  ownTurn: true,
  dodging: false,
  disengaged: false,
  ...over,
});

const KIT: TurnKit = {
  attacks: [
    {
      key: 'main',
      name: 'Длинный меч',
      tip: 'Длинный меч · +5',
      bonusAction: false,
      image: null,
    },
  ],
  unarmed: 'Безоружный удар · +3',
  abilities: [
    { id: 'l1', prepared: null, ability: card({ name: 'Второе дыхание' }) },
    {
      id: 'l2',
      prepared: null,
      ability: card({ name: 'Тёмное зрение', activation: { kind: 'trait' } }),
    },
    { id: 'l3', prepared: true, ability: spell('Огненный снаряд', 0) },
    {
      id: 'l4',
      prepared: true,
      ability: spell('Щит', 1, {
        activation: { kind: 'reaction', trigger: '' },
      }),
    },
    { id: 'l5', prepared: false, ability: spell('Огненный шар', 3) },
    { id: 'l6', prepared: true, ability: spell('Палящий луч', 2) },
  ],
  slots: {
    1: { total: 2, expended: 0 },
    2: { total: 1, expended: 1 },
    3: { total: 1, expended: 0 },
  },
};

const byName = (tiles: ReturnType<typeof turnTiles>) =>
  new Map(tiles.map((t) => [t.name, t]));

describe('turnTiles', () => {
  it('раскладывает по группам, без черт и неподготовленных заклинаний', () => {
    const tiles = turnTiles(KIT, state());
    expect(tiles.map((t) => [t.group, t.name])).toEqual([
      ['attacks', 'Длинный меч'],
      ['attacks', 'Безоружный удар'],
      ['abilities', 'Второе дыхание'],
      ['spells', 'Огненный снаряд'],
      ['spells', 'Щит'],
      ['spells', 'Палящий луч'],
      ['actions', 'Рывок'],
      ['actions', 'Отход'],
      ['actions', 'Уклонение'],
    ]);
  });

  it('атаки пока только описывают, заклинания несут свой круг', () => {
    const tiles = byName(turnTiles(KIT, state()));
    expect(tiles.get('Длинный меч')?.use).toEqual({ kind: 'info' });
    expect(tiles.get('Длинный меч')?.block).not.toBeNull();
    expect(tiles.get('Длинный меч')?.level).toBeNull();
    expect(tiles.get('Огненный снаряд')?.level).toBe(0);
    expect(tiles.get('Щит')).toMatchObject({
      level: 1,
      cost: 'reaction',
      use: { kind: 'ability', abilityId: 'l4', slotMin: 1 },
      block: null,
    });
  });

  it('без свободной ячейки — бледное с причиной', () => {
    const tiles = byName(turnTiles(KIT, state()));
    // Ячейка 2 круга потрачена, но есть 3-го — можно поднять круг.
    expect(tiles.get('Палящий луч')?.block).toBeNull();
    const spent = byName(
      turnTiles({ ...KIT, slots: { 1: { total: 2, expended: 2 } } }, state()),
    );
    expect(spent.get('Щит')?.block).toBe('Нет свободных ячеек 1 круга и выше');
  });

  it('не в свой ход можно только реакцию', () => {
    const tiles = byName(turnTiles(KIT, state({ ownTurn: false })));
    expect(tiles.get('Щит')?.block).toBeNull();
    expect(tiles.get('Второе дыхание')?.block).toBe('Сейчас не ваш ход');
    expect(tiles.get('Рывок')?.block).toBe('Сейчас не ваш ход');
  });

  it('действие потрачено или уклонение уже идёт — нельзя', () => {
    const spent = byName(
      turnTiles(KIT, state({ resources: resources([1, 0, 0]) })),
    );
    expect(spent.get('Рывок')?.block).toBe('В этом ходу действий больше нет');
    const dodging = byName(turnTiles(KIT, state({ dodging: true })));
    expect(dodging.get('Уклонение')?.block).toBe('Уклонение уже действует');
    expect(dodging.get('Отход')?.block).toBeNull();
  });

  it('у монстра без ячеек заклинание не просит ячейку', () => {
    const tiles = turnTiles(
      { attacks: [], unarmed: null, abilities: KIT.abilities, slots: null },
      state(),
    );
    const fireball = tiles.find((t) => t.name === 'Палящий луч');
    expect(fireball?.use).toEqual({
      kind: 'ability',
      abilityId: 'l6',
      slotMin: null,
    });
    expect(fireball?.block).toBeNull();
    expect(tiles.some((t) => t.name === 'Безоружный удар')).toBe(false);
  });
});

describe('spellLevels', () => {
  it('подгруппы по кругу заклинания, заговоры первыми, ячейки круга при нём', () => {
    const levels = spellLevels(turnTiles(KIT, state()), KIT.slots);
    expect(
      levels.map((l) => [l.label, l.slot, l.tiles.map((t) => t.name)]),
    ).toEqual([
      ['Заговоры', undefined, ['Огненный снаряд']],
      ['1 круг', { total: 2, expended: 0 }, ['Щит']],
      ['2 круг', { total: 1, expended: 1 }, ['Палящий луч']],
    ]);
  });
});

describe('freeSlotLevels и slotsLine', () => {
  it('круги со свободной ячейкой не ниже нужного', () => {
    expect(freeSlotLevels(KIT.slots, 1)).toEqual([1, 3]);
    expect(freeSlotLevels(KIT.slots, 2)).toEqual([3]);
    expect(freeSlotLevels(null, 1)).toEqual([]);
  });

  it('строка ячеек: свободные закрашены', () => {
    expect(slotsLine(KIT.slots)).toBe('1 ●● · 2 ○ · 3 ●');
    // Ячейки кругов со своими заклинаниями — у подзаголовков, в строке остальные.
    expect(slotsLine(KIT.slots, new Set([1, 2]))).toBe('3 ●');
    expect(slotsLine(KIT.slots, new Set([1, 2, 3]))).toBeNull();
    expect(slotsLine({})).toBeNull();
    expect(slotsLine(null)).toBeNull();
  });
});
