import { DAMAGE_TYPES } from './damageTypes.js';
import type { EffectComponent } from './effectComponents.js';
import type { ConditionKind } from './effectConditions.js';

// 15 состояний книги 2024 как наборы тех же составляющих, из которых пишут свои эффекты
// (docs/plan/effects-coverage.md, «Состояния книги движок будет знать сам»; правила —
// docs/dnd/conditions.md). Это проверка на бумаге в коде: что составляющими не выразить,
// названо в gaps буквой пробела из плана, и тесты сверяют это с планом.

// Пробелы плана, которые ещё не закрыты: В — ограничения действий, Д — крит вблизи,
// Ж — не видит или не слышит, З — конец по действию или событию, И — уровни,
// Р — «если противник видит носителя» у Невидимого, 7.5 — бонус к броску.
export type ConditionGap = 'В' | 'Д' | 'Ж' | 'З' | 'И' | 'Р' | '7.5';

export type ConditionRules = {
  components: readonly EffectComponent[];
  // Состояния, которые это включает по книге: их составляющие не копируем.
  includes: readonly ConditionKind[];
  gaps: readonly ConditionGap[];
};

const advantage = (
  mode: 'advantage' | 'disadvantage',
  roll: 'attack' | 'attacked' | 'save' | 'check' | 'initiative',
  more: Partial<{
    ability: 'dexterity';
    when: 'within_5ft' | 'beyond_5ft' | 'source_in_sight' | 'not_vs_source';
  }> = {},
): EffectComponent => ({
  kind: 'advantage',
  mode,
  roll,
  ability: more.ability ?? null,
  when: more.when ?? null,
});

const speedZero: EffectComponent = {
  kind: 'speed',
  change: 'zero',
  feet: null,
  hover: false,
};
const attackedWithAdvantage = advantage('advantage', 'attacked');
// Парализованный, Окаменевший, Ошеломлённый, Бессознательный.
const failsStrDex: EffectComponent[] = [
  { kind: 'auto_fail', roll: 'save', ability: 'strength' },
  { kind: 'auto_fail', roll: 'save', ability: 'dexterity' },
];

export const CONDITION_RULES: Record<ConditionKind, ConditionRules> = {
  blinded: {
    components: [
      { kind: 'auto_fail', roll: 'sight_check', ability: null },
      attackedWithAdvantage,
      advantage('disadvantage', 'attack'),
    ],
    includes: [],
    gaps: ['Ж'],
  },
  // Не может атаковать очаровавшего; преимущество очаровавшего — его бросок.
  charmed: { components: [], includes: [], gaps: ['В'] },
  deafened: {
    components: [{ kind: 'auto_fail', roll: 'hearing_check', ability: null }],
    includes: [],
    gaps: ['Ж'],
  },
  // Один уровень: каждое получение — +1 (effectConditions.ts). −2 к Тестам к20 за
  // уровень ждёт 7.5, смерть на 6 и снятие уровня долгим отдыхом — И.
  exhaustion: {
    components: [{ kind: 'speed', change: 'slower', feet: 5, hover: false }],
    includes: [],
    gaps: ['7.5', 'И'],
  },
  frightened: {
    components: [
      advantage('disadvantage', 'check', { when: 'source_in_sight' }),
      advantage('disadvantage', 'attack', { when: 'source_in_sight' }),
    ],
    includes: [],
    gaps: ['В'],
  },
  grappled: {
    components: [
      speedZero,
      advantage('disadvantage', 'attack', { when: 'not_vs_source' }),
    ],
    includes: [],
    gaps: ['З'],
  },
  incapacitated: {
    components: [advantage('disadvantage', 'initiative')],
    includes: [],
    gaps: ['В'],
  },
  invisible: {
    components: [
      advantage('advantage', 'initiative'),
      advantage('disadvantage', 'attacked'),
      advantage('advantage', 'attack'),
    ],
    includes: [],
    gaps: ['Р'],
  },
  paralyzed: {
    components: [speedZero, ...failsStrDex, attackedWithAdvantage],
    includes: ['incapacitated'],
    gaps: ['Д'],
  },
  // Вес ×10 и «не стареет» — в описании, это не пробел.
  petrified: {
    components: [
      speedZero,
      ...failsStrDex,
      attackedWithAdvantage,
      {
        kind: 'defense',
        level: 'resistance',
        damageTypes: [...DAMAGE_TYPES],
        conditions: [],
      },
      {
        kind: 'defense',
        level: 'immunity',
        damageTypes: [],
        conditions: ['poisoned'],
      },
    ],
    includes: ['incapacitated'],
    gaps: [],
  },
  poisoned: {
    components: [
      advantage('disadvantage', 'attack'),
      advantage('disadvantage', 'check'),
    ],
    includes: [],
    gaps: [],
  },
  prone: {
    components: [
      advantage('disadvantage', 'attack'),
      advantage('advantage', 'attacked', { when: 'within_5ft' }),
      advantage('disadvantage', 'attacked', { when: 'beyond_5ft' }),
    ],
    includes: [],
    gaps: ['З'],
  },
  restrained: {
    components: [
      speedZero,
      attackedWithAdvantage,
      advantage('disadvantage', 'attack'),
      advantage('disadvantage', 'save', { ability: 'dexterity' }),
    ],
    includes: [],
    gaps: [],
  },
  stunned: {
    components: [...failsStrDex, attackedWithAdvantage],
    includes: ['incapacitated'],
    gaps: [],
  },
  // Роняет то, что держит, и не осознаёт окружение — в описании.
  unconscious: {
    components: [speedZero, ...failsStrDex, attackedWithAdvantage],
    includes: ['incapacitated', 'prone'],
    gaps: ['Д'],
  },
};
