import { describe, expect, it } from 'vitest';
import {
  MONSTER_CHALLENGES,
  challengeProficiencyBonus,
  challengeXp,
  isMonsterChallenge,
} from './monsterChallenge.js';
import {
  DEFAULT_MONSTER_STAT_BLOCK,
  type MonsterStatBlock,
} from './monsters.js';
import { isMonsterStatBlock } from './monsterStatBlockCheck.js';

// Аболет книги 2024 (docs/dnd/monsters.md).
const aboleth: MonsterStatBlock = {
  ...DEFAULT_MONSTER_STAT_BLOCK,
  size: 'large',
  alignment: 'законно-злой',
  armorClass: 17,
  initiative: 7,
  hitPoints: { average: 150, dice: { count: 20, die: 10, bonus: 40 } },
  speed: { ...DEFAULT_MONSTER_STAT_BLOCK.speed, walk: 10, swim: 40 },
  abilities: {
    ...DEFAULT_MONSTER_STAT_BLOCK.abilities,
    strength: { score: 21, save: 5 },
    dexterity: { score: 9, save: 3 },
  },
  skills: [
    { skill: 'history', bonus: 12 },
    { skill: 'perception', bonus: 10 },
  ],
  senses: [{ sense: 'darkvision', range: 120 }],
  passivePerception: 20,
  languages: 'Глубинная речь; телепатия 120 фт.',
  challenge: '10',
  lairXp: 7200,
  legendaryActions: 3,
  legendaryActionsLair: 4,
  spellcasting: { ability: 'intelligence', saveDc: 16, attackBonus: null },
};

describe('isMonsterStatBlock', () => {
  it('принимает стат-блок по умолчанию и аболета', () => {
    expect(isMonsterStatBlock(DEFAULT_MONSTER_STAT_BLOCK)).toBe(true);
    expect(isMonsterStatBlock(aboleth)).toBe(true);
  });

  it('принимает полёт с парением и защиты', () => {
    expect(
      isMonsterStatBlock({
        ...aboleth,
        speed: { ...aboleth.speed, fly: 90, hover: true },
        resistances: ['cold', 'fire'],
        immunities: ['poison'],
        conditionImmunities: ['poisoned', 'exhaustion'],
      }),
    ).toBe(true);
  });

  it.each<[string, Record<string, unknown>]>([
    ['неизвестный размер', { size: 'colossal' }],
    ['ПО вне таблицы', { challenge: '31' }],
    ['ПО числом', { challenge: 10 }],
    ['КД 0', { armorClass: 0 }],
    ['инициатива дробью', { initiative: 1.5 }],
    ['мировоззрение длиннее 30', { alignment: 'з'.repeat(31) }],
    ['хиты без формулы', { hitPoints: { average: 150 } }],
    [
      'кость хитов к7',
      { hitPoints: { average: 10, dice: { count: 2, die: 7, bonus: 0 } } },
    ],
    ['скорость не кратна 5', { speed: { ...aboleth.speed, walk: 12 } }],
    ['парит без полёта', { speed: { ...aboleth.speed, hover: true } }],
    [
      'характеристика 31',
      {
        abilities: {
          ...aboleth.abilities,
          strength: { score: 31, save: 10 },
        },
      },
    ],
    [
      'нет характеристики',
      { abilities: { strength: aboleth.abilities.strength } },
    ],
    ['навык дважды', { skills: [aboleth.skills[0], aboleth.skills[0]] }],
    ['неизвестный навык', { skills: [{ skill: 'luck', bonus: 1 }] }],
    ['урон дважды', { resistances: ['fire', 'fire'] }],
    ['неизвестное состояние', { conditionImmunities: ['bored'] }],
    [
      'чувство дважды',
      {
        senses: [
          { sense: 'darkvision', range: 60 },
          { sense: 'darkvision', range: 120 },
        ],
      },
    ],
    ['логово без легендарных', { legendaryActions: null }],
    [
      'колдовство неизвестной характеристикой',
      { spellcasting: { ability: 'luck', saveDc: 16, attackBonus: 8 } },
    ],
    ['лишнее поле', { speedBonus: 10 }],
  ])('отклоняет: %s', (_, over) => {
    expect(isMonsterStatBlock({ ...aboleth, ...over })).toBe(false);
  });

  it('отклоняет стат-блок без поля и не объект', () => {
    const { tags: _, ...noTags } = aboleth;
    expect(isMonsterStatBlock(noTags)).toBe(false);
    expect(isMonsterStatBlock(null)).toBe(false);
    expect(isMonsterStatBlock([aboleth])).toBe(false);
  });
});

describe('ПО монстра', () => {
  it('идёт от 0 до 30 с дробями', () => {
    expect(MONSTER_CHALLENGES).toHaveLength(34);
    expect(MONSTER_CHALLENGES.slice(0, 5)).toEqual([
      '0',
      '1/8',
      '1/4',
      '1/2',
      '1',
    ]);
    expect(MONSTER_CHALLENGES.at(-1)).toBe('30');
    expect(isMonsterChallenge('1/8')).toBe(true);
    expect(isMonsterChallenge('0.125')).toBe(false);
    expect(isMonsterChallenge('toString')).toBe(false);
  });

  it('даёт опыт и бонус мастерства по таблице книги', () => {
    expect([challengeXp('1/8'), challengeProficiencyBonus('1/8')]).toEqual([
      25, 2,
    ]);
    expect([challengeXp('10'), challengeProficiencyBonus('10')]).toEqual([
      5900, 4,
    ]);
    expect([challengeXp('30'), challengeProficiencyBonus('30')]).toEqual([
      155000, 9,
    ]);
  });
});
