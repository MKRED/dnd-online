import {
  ABILITY_ACTIVATION_KINDS,
  DEFAULT_MONSTER_STAT_BLOCK,
  NO_ABILITY_COSTS,
  type AbilityActivation,
  type MonsterAbilityEntry,
} from 'shared';
import { describe, expect, it } from 'vitest';
import {
  monsterGroupKinds,
  monsterSkillGroups,
  monsterSpellGroups,
} from './monsterAbilitiesView';

const row = (
  name: string,
  activation: AbilityActivation,
  perDay: number | null = null,
  category: 'monster' | 'spell' = 'monster',
): MonsterAbilityEntry => ({
  id: name,
  perDay,
  ability: {
    id: name,
    name,
    isPublic: true,
    image: null,
    category,
    level: category === 'spell' ? 2 : null,
    activation,
    costs: NO_ABILITY_COSTS,
    recharge: null,
    passive: [],
  },
  missing: null,
  inactive: false,
});

const names = (groups: { title: string; entries: MonsterAbilityEntry[] }[]) =>
  groups.map((g) => [g.title, g.entries.map((e) => e.ability?.name ?? '—')]);

describe('группы способностей монстра', () => {
  // Новая активация без группы молча пропала бы с карточки.
  it('каждая активация попадает ровно в одну группу', () => {
    expect([...monsterGroupKinds()].sort()).toEqual(
      [...ABILITY_ACTIVATION_KINDS].sort(),
    );
  });

  it('разделы стат-блока, запас легендарных действий в заголовке', () => {
    const groups = monsterSkillGroups(
      [
        row('Хлестнуть', { kind: 'legendary', cost: 1 }),
        row('Щупальце', { kind: 'action' }),
        row('Амфибия', { kind: 'trait' }),
        row('Обнаружение мыслей', { kind: 'action' }, null, 'spell'),
        row('Мультиатака', { kind: 'attack' }),
        { id: 'x', perDay: null, ability: null, missing: 'deleted' },
      ],
      { ...DEFAULT_MONSTER_STAT_BLOCK, legendaryActions: 3 },
    );
    expect(names(groups)).toEqual([
      ['Черты', ['Амфибия']],
      ['Действия', ['Щупальце', 'Мультиатака']],
      ['Легендарные действия (3 за раунд)', ['Хлестнуть']],
      ['Недоступны', ['—']],
    ]);
  });

  it('заклинания: «Неограниченно», затем «N/день» по убыванию', () => {
    const action = { kind: 'action' } as const;
    expect(
      names(
        monsterSpellGroups([
          row('Подчинение', action, 1, 'spell'),
          row('Мысли', action, null, 'spell'),
          row('Невидимость', action, 3, 'spell'),
          row('Щупальце', action),
          row('Внушение', action, 1, 'spell'),
        ]),
      ),
    ).toEqual([
      ['Неограниченно', ['Мысли']],
      ['3/день', ['Невидимость']],
      ['1/день', ['Подчинение', 'Внушение']],
    ]);
  });
});
