import {
  NO_ABILITY_COSTS,
  NO_STEP_GROWTH,
  type AbilityStep,
  type SpellDetails,
} from 'shared';
import type { AbilityCard } from '../abilityRows';

// Примеры гайда (docs/dnd/spells.md, docs/dnd/attacks-and-saves.md; числа сверены с
// free rules 2024). Каждый добавляет одну новую мысль; карточку гайд строит из этих
// данных тем же кодом, что и настоящую, а что выбрать в форме — пишет текстом (fill).
export interface GuideExample {
  name: string;
  // Чему учит пример — подзаголовок в списке.
  idea: string;
  fill: { field: string; value: string }[];
  // Что пример не показывает, но о чём стоит знать.
  note?: string;
  ability: AbilityCard;
}

// Компоненты в примерах не пишем: перевода из книги под рукой нет, а в форме их пишут
// как в книге.
const spell = (level: number, school: SpellDetails['school']) => ({
  category: 'spell' as const,
  details: {
    level,
    school,
    components: '',
    ritual: false,
    duration: { kind: 'instant' as const },
  },
});

const bySpellcasting = { kind: 'ability', ability: 'spellcasting' } as const;
const fire = (count: number, die: 6 | 10) => ({
  count,
  die,
  number: 0,
  type: 'fire' as const,
});

const fireBolt: AbilityStep = {
  when: 'always',
  target: { kind: 'range', feet: 120, longFeet: null },
  times: 1,
  check: { kind: 'attack', attack: 'ranged_spell', bonus: bySpellcasting },
  hit: { damage: [fire(1, 10)], addModifier: false },
  miss: { damage: 'none' },
  growth: { damage: [fire(1, 10)], times: 0 },
};

const fireball: AbilityStep = {
  when: 'always',
  target: {
    kind: 'area',
    area: { shape: 'sphere', radius: 20 },
    origin: { kind: 'point', feet: 150 },
  },
  times: 1,
  check: { kind: 'save', ability: 'dexterity', dc: bySpellcasting },
  hit: { damage: [fire(8, 6)], addModifier: false },
  miss: { damage: 'half' },
  growth: { damage: [fire(1, 6)], times: 0 },
};

const iceKnife: AbilityStep[] = [
  {
    when: 'always',
    target: { kind: 'range', feet: 60, longFeet: null },
    times: 1,
    check: { kind: 'attack', attack: 'ranged_spell', bonus: bySpellcasting },
    hit: {
      damage: [{ count: 1, die: 10, number: 0, type: 'piercing' }],
      addModifier: false,
    },
    miss: { damage: 'none' },
    growth: NO_STEP_GROWTH,
  },
  {
    when: 'always',
    target: { kind: 'around', feet: 5 },
    times: 1,
    check: { kind: 'save', ability: 'dexterity', dc: bySpellcasting },
    hit: {
      damage: [{ count: 2, die: 6, number: 0, type: 'cold' }],
      addModifier: false,
    },
    miss: { damage: 'none' },
    growth: {
      damage: [{ count: 1, die: 6, number: 0, type: 'cold' }],
      times: 0,
    },
  },
];

const magicMissile: AbilityStep = {
  when: 'always',
  target: { kind: 'range', feet: 120, longFeet: null },
  times: 3,
  check: { kind: 'none' },
  hit: {
    damage: [{ count: 1, die: 4, number: 1, type: 'force' }],
    addModifier: false,
  },
  miss: { damage: 'none' },
  growth: { damage: [], times: 1 },
};

const breath: AbilityStep = {
  when: 'always',
  target: {
    kind: 'area',
    area: { shape: 'cone', length: 15 },
    origin: { kind: 'self' },
  },
  times: 1,
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'constitution' },
  },
  hit: { damage: [fire(1, 10)], addModifier: false },
  miss: { damage: 'half' },
  growth: { damage: [fire(1, 10)], times: 0 },
};

const slot = (minLevel: number) => ({
  ...NO_ABILITY_COSTS,
  spellSlot: { minLevel },
});

export const GUIDE_EXAMPLES: GuideExample[] = [
  {
    name: 'Огненный снаряд',
    idea: 'Одна атака, рост с уровнем персонажа',
    fill: [
      { field: 'Категория', value: 'Заклинание, Заговор, Воплощение' },
      { field: 'Проверка', value: 'Бросок атаки, дальнобойная заклинанием' },
      { field: 'Цель', value: 'Дистанция 120 фт.' },
      { field: 'При попадании', value: '1d10 Огонь' },
      {
        field: 'Рост',
        value: '+1d10 Огонь — заголовок сам скажет «на 5, 11 и 17 уровне»',
      },
    ],
    ability: {
      ...spell(0, 'evocation'),
      activation: { kind: 'action' },
      costs: NO_ABILITY_COSTS,
      steps: [fireBolt],
    },
  },
  {
    name: 'Огненный шар',
    idea: 'Спасбросок, область, рост с ячейкой',
    fill: [
      {
        field: 'Категория',
        value: 'Заклинание, 3 круг — ячейка отметится сама',
      },
      { field: 'Проверка', value: 'Спасбросок Ловкости' },
      {
        field: 'Цель',
        value: 'Область: сфера радиусом 20 фт. в точке на 150 фт.',
      },
      { field: 'При провале', value: '8d6 Огонь' },
      { field: 'При успехе', value: 'Половина урона' },
      { field: 'Рост', value: '+1d6 Огонь — за один круг, а не за все сразу' },
    ],
    ability: {
      ...spell(3, 'evocation'),
      activation: { kind: 'action' },
      costs: slot(3),
      steps: [fireball],
    },
  },
  {
    name: 'Ледяной кинжал',
    idea: 'Два шага: атака, затем взрыв вокруг цели',
    fill: [
      {
        field: 'Шаг 1',
        value: 'Бросок атаки на 60 фт., при попадании 1d10 Колющий',
      },
      { field: 'Шаг 2 — Когда', value: 'Всегда: взрыв и при промахе' },
      { field: 'Шаг 2 — Цель', value: 'Она и все вокруг неё, 5 фт.' },
      { field: 'Шаг 2', value: 'Спасбросок Ловкости, при провале 2d6 Холод' },
      { field: 'Рост', value: 'Только у шага 2: +1d6 Холод' },
    ],
    ability: {
      ...spell(1, 'conjuration'),
      activation: { kind: 'action' },
      costs: slot(1),
      steps: iceKnife,
    },
  },
  {
    name: 'Волшебная стрела',
    idea: 'Без проверки, несколько повторов, рост повторами',
    fill: [
      { field: 'Проверка', value: 'Без проверки — дротики не промахиваются' },
      { field: 'Сколько раз', value: '3' },
      { field: 'Урон', value: '1d4 + 1 Силовой' },
      {
        field: 'Рост',
        value:
          'Ещё повторов: 1. Строку урона, которую подставит «+ Рост», уберите ✕',
      },
    ],
    ability: {
      ...spell(1, 'evocation'),
      activation: { kind: 'action' },
      costs: slot(1),
      steps: [magicMissile],
    },
  },
  {
    name: 'Оружие дыхания',
    idea: 'Не заклинание: заряды, вместо атаки, рост с уровнем',
    fill: [
      { field: 'Категория', value: 'Базовая' },
      { field: 'Активация', value: 'Вместо одной атаки' },
      {
        field: 'Затраты',
        value: 'Заряды: Бонус мастерства, все — после долгого отдыха',
      },
      {
        field: 'Проверка',
        value: 'Спасбросок Ловкости, Сл: 8 + Телосложение + бонус мастерства',
      },
      { field: 'Цель', value: 'Область: конус 15 фт. от себя' },
      { field: 'При провале', value: '1d10, при успехе половина. Рост +1d10' },
    ],
    note: 'Тип урона зависит от драконьего предка — здесь для примера Огонь. Линию 30 × 5 фт. вместо конуса заведите второй способностью или опишите в описании: у шага одна фигура.',
    ability: {
      category: 'basic',
      details: {},
      activation: { kind: 'attack' },
      costs: {
        ...NO_ABILITY_COSTS,
        uses: { count: { kind: 'proficiency' }, recovery: 'long' },
      },
      steps: [breath],
    },
  },
];
