import {
  ABILITY_CHECK_LABELS,
  ABILITY_STEPS_MAX,
  ACTIVATION_LABELS,
  AREA_SHAPE_LABELS,
  ATTACK_ABILITIES,
  ATTACK_KIND_LABELS,
  DAMAGE_DICE,
  DAMAGE_TYPES,
  DEFAULT_ABILITY_FIELDS,
  EFFECT_COMPONENTS_MAX,
  MONSTER_ACTIVATION_KINDS,
  TRAIT_CATEGORIES,
  SAVE_DC_ABILITIES,
  SPELL_DURATION_LABELS,
  SPELL_SCHOOL_LABELS,
  STEP_TARGET_LABELS,
  USES_RECOVERIES,
  type AbilityCategory,
  type AbilityInput,
  type AbilityStep,
} from 'shared';
import { fieldLines, labeled, list, sample } from './common.js';

const FIELDS = {
  name: 'название, до 100 символов',
  category: 'категория, см. details ниже',
  details: 'поля категории',
  activation: `как применяют: ${labeled(ACTIVATION_LABELS)}. reaction и free — {kind, trigger} («когда…», можно пусто), time — {kind, amount, unit: minute|hour}, legendary — {kind, cost}; ${list(MONSTER_ACTIVATION_KINDS)} — только у категории monster, trait (пассивная черта: действует всегда) — у ${list(TRAIT_CATEGORIES)}`,
  costs: `затраты {uses, spellSlot, movement, hitDie}: uses — {count: {kind: fixed, amount} | {kind: proficiency} | {kind: ability, ability}, recovery: ${list(USES_RECOVERIES)}} или null; spellSlot — {minLevel} или null; movement — {kind: half|all} | {kind: feet, feet} или null; hitDie — тратит ли кость хитов`,
  steps: `«Применение» — до ${ABILITY_STEPS_MAX} шагов, см. ниже; [] — всё в описании`,
  passive: `только у activation trait: что черта даёт владельцу всегда — до ${EFFECT_COMPONENTS_MAX} составляющих {kind, …}, как components эффекта (format_guide kind effect); лист считает их и в виде «Без эффектов». [] или без поля — всё в описании`,
  description: 'полный текст способности, как в книге',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof AbilityInput, string>;

const DETAILS = {
  basic: '{} — умение класса, вида, черты, оружия',
  spell: `{level, school, components, ritual, duration}: level 0 (заговор)..9; school: ${labeled(SPELL_SCHOOL_LABELS)}; components — строка «В, С, М (…)»; duration: {kind: ${list(Object.keys(SPELL_DURATION_LABELS))}}, у time ещё amount, unit (round|minute|hour|day) и concentration`,
  monster:
    '{recharge} — нижняя граница к6 перезарядки («Перезарядка 5–6» — 5) или null',
} satisfies Record<AbilityCategory, string>;

// Пример шага — укус: рукопашная атака оружием +4, 1к4 колющего. Тип AbilityStep держит
// пример в форме, которую принимает сервер.
const BITE: AbilityStep = {
  when: 'always',
  target: { kind: 'reach', feet: 5 },
  times: 1,
  check: {
    kind: 'attack',
    attack: 'melee_weapon',
    bonus: { kind: 'fixed', value: 4 },
  },
  hit: {
    damage: [{ count: 1, die: 4, number: 0, type: 'piercing' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'none', effects: [] },
  growth: { damage: [], times: 0 },
};

export const abilityGuide = () => [
  'СПОСОБНОСТЬ (kind ability) — заклинание, умение или действие монстра',
  ...fieldLines(FIELDS),
  '',
  'DETAILS ПО КАТЕГОРИЯМ',
  ...fieldLines(DETAILS),
  `Заготовка общих полей: ${sample(DEFAULT_ABILITY_FIELDS)}`,
  '',
  'ШАГ «ПРИМЕНЕНИЯ» {when, target, times, check, hit, miss, growth}',
  '- when: always у первого шага; у следующих — always, hit (при попадании или провале спасброска прошлого шага) или miss',
  `- target: ${labeled(STEP_TARGET_LABELS)}. reach — {feet}, range — {feet, longFeet|null}, around — {feet} — футы от 5 и кратно 5 (досягаемость 0 фт., как у роя, — touch, а «0 фт.» оставь в description), area — {area: {shape, …}, origin: {kind: self} | {kind: point, feet}}; previous и around — только со второго шага`,
  `- area.shape: ${labeled(AREA_SHAPE_LABELS)}; размеры в футах: cone {length}, cube {size}, cylinder {radius, height}, emanation {distance}, line {length, width}, sphere {radius}`,
  '- times — сколько раз (лучи «Палящего луча»)',
  `- check: ${labeled(ABILITY_CHECK_LABELS)}. attack — {kind, attack: ${labeled(ATTACK_KIND_LABELS)}, bonus: {kind: ability, ability: ${list(ATTACK_ABILITIES)}} | {kind: fixed, value}}; save — {kind, ability, dc: {kind: ability, ability: ${list(SAVE_DC_ABILITIES)}} | {kind: fixed, value}}`,
  `- hit: {damage: [{count, die, number, type}], addModifier, effects: [{effectId}]}; die: ${list(DAMAGE_DICE)}; type: ${list(DAMAGE_TYPES)}; addModifier — только у атаки с bonus от характеристики`,
  '- miss: {damage: none|half, effects: [{effectId}]}; у check none — {damage: none, effects: []}',
  '- growth: {damage, times} — прибавка за каждый круг ячейки выше минимального, а у заговора и прочего — на 5, 11 и 17 уровне; {damage: [], times: 0} — не растёт',
  '- effects — id эффектов каталога (search kind effect), накладываются на цель по исходу',
  `Пример шага (укус: +4 к попаданию, 1к4 колющего): ${sample(BITE)}`,
];
