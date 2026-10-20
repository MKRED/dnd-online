import {
  ABILITY_SCORES,
  ADVANTAGE_MODE_LABELS,
  ADVANTAGE_ROLL_LABELS,
  ADVANTAGE_WHEN_LABELS,
  ARMOR_CLASS_CHANGE_LABELS,
  AUTO_FAIL_ROLL_LABELS,
  CONDITION_LABELS,
  DAMAGE_DICE,
  DAMAGE_TYPES,
  DEFENSE_LEVEL_LABELS,
  DURATION_RESTS,
  DURATION_TURN_EDGES,
  DURATION_TURN_OWNERS,
  DURATION_UNITS,
  EFFECT_COMPONENT_LABELS,
  EFFECT_COMPONENTS_MAX,
  PER_TURN_OUTCOME_LABELS,
  ROLL_BONUS_MODE_LABELS,
  ROLL_BONUS_ROLL_LABELS,
  SENSE_LABELS,
  SPEED_CHANGE_LABELS,
  type EffectComponentKind,
  type EffectFields,
  type EffectInput,
} from 'shared';
import { fieldLines, labeled, list, sample } from './common.js';

const FIELDS = {
  name: 'название, до 100 символов',
  components: `что эффект делает — до ${EFFECT_COMPONENTS_MAX} составляющих {kind, …}, см. ниже; [] — всё в описании`,
  duration: `{kind: permanent} | {kind: time, amount, unit: ${list(DURATION_UNITS)}, concentration} | {kind: turn, edge: ${list(DURATION_TURN_EDGES)}, owner: ${list(DURATION_TURN_OWNERS)}} | {kind: rest, rest: ${list(DURATION_RESTS)}}`,
  saveEnds: `{ability, edge: start|end} — спасбросок в начале или конце хода снимает эффект, или null; ability: ${list(ABILITY_SCORES)}`,
  description: 'полный текст, как в книге',
  sources: 'источники — строки',
  isPublic: 'false (create ставит сам)',
} satisfies Record<keyof EffectInput, string>;

const COMPONENTS = {
  sense: `{sense, range}: ${labeled(SENSE_LABELS)}; range в футах или null`,
  condition: `{condition}: ${labeled(CONDITION_LABELS)}; каждое один раз, истощение — +1 уровень`,
  per_turn: `{outcome, damageType, count, die, bonus, addModifier, edge}: outcome ${labeled(PER_TURN_OUTCOME_LABELS)}; damageType — тип урона у damage, иначе null; die: ${list(DAMAGE_DICE)}; edge — start|end хода`,
  defense: `{level, damageTypes, conditions}: level ${labeled(DEFENSE_LEVEL_LABELS)}; damageTypes: ${list(DAMAGE_TYPES)}; conditions — состояния`,
  no_healing: 'без полей — носитель не восстанавливает хиты',
  speed: `{change, feet, hover}: change ${labeled(SPEED_CHANGE_LABELS)}; feet — число футов, где оно нужно, иначе null; hover — только с fly`,
  advantage: `{mode, roll, ability, when}: mode ${labeled(ADVANTAGE_MODE_LABELS)}; roll ${labeled(ADVANTAGE_ROLL_LABELS)}; ability — характеристика спасброска или проверки, или null; when: ${labeled(ADVANTAGE_WHEN_LABELS)} или null`,
  auto_fail: `{roll, ability}: roll ${labeled(AUTO_FAIL_ROLL_LABELS)}; ability — характеристика спасброска или null`,
  armor_class: `{change, value}: change ${labeled(ARMOR_CLASS_CHANGE_LABELS)}`,
  roll_bonus: `{mode, roll, ability, count, die, number, damageType}: mode ${labeled(ROLL_BONUS_MODE_LABELS)}; roll ${labeled(ROLL_BONUS_ROLL_LABELS)}; бонус — count костей die плюс number; damageType — только у damage, иначе null`,
} satisfies Record<EffectComponentKind, string>;

// Пример — «Отравлен» на минуту со спасброском Телосложения в конце хода. Тип держит
// пример в форме, которую принимает сервер.
const POISONED: EffectFields = {
  components: [{ kind: 'condition', condition: 'poisoned' }],
  duration: { kind: 'time', amount: 1, unit: 'minute', concentration: false },
  saveEnds: { ability: 'constitution', edge: 'end' },
};

export const effectGuide = () => [
  'ЭФФЕКТ (kind effect) — состояние, бафф или проклятие на существе',
  ...fieldLines(FIELDS),
  '',
  'СОСТАВЛЯЮЩИЕ (components[].kind)',
  ...Object.entries(COMPONENTS).map(
    ([kind, about]) =>
      `- ${kind} (${EFFECT_COMPONENT_LABELS[kind as EffectComponentKind]}) — ${about}`,
  ),
  `Пример (отравлен на минуту, спасбросок Телосложения в конце хода): ${sample(POISONED)}`,
];
