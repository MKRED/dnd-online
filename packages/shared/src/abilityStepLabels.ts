import { formatArea, formatAreaOrigin } from './abilityStepAreas.js';
import type {
  AbilityCheck,
  AbilityCheckKind,
  AbilityStep,
  AttackAbility,
  AttackKind,
  DamagePart,
  SaveDcAbility,
  StepTarget,
  StepTargetKind,
} from './abilitySteps.js';
import { ABILITY_GENITIVE } from './abilityUsageLabels.js';
import { DAMAGE_TYPE_LABELS } from './damageTypes.js';

// Тексты шагов «Применения» для формы и карточки (docs/dnd/attacks-and-saves.md).

export const ABILITY_CHECK_LABELS: Record<AbilityCheckKind, string> = {
  attack: 'Бросок атаки',
  save: 'Спасбросок',
  none: 'Без проверки',
};

export const ATTACK_KIND_LABELS: Record<AttackKind, string> = {
  melee_weapon: 'Ближняя атака оружием',
  ranged_weapon: 'Дальнобойная атака оружием',
  melee_spell: 'Ближняя атака заклинанием',
  ranged_spell: 'Дальнобойная атака заклинанием',
};

export const STEP_TARGET_LABELS: Record<StepTargetKind, string> = {
  self: 'На себя',
  touch: 'Касание',
  reach: 'Досягаемость',
  range: 'Дистанция',
  area: 'Область',
};

// Подписи исходов: у атаки — попадание и промах, у спасброска — провал и успех. Без
// проверки урон проходит всегда, второго исхода нет.
export const OUTCOME_LABELS: Record<
  AbilityCheckKind,
  { hit: string; miss: string | null }
> = {
  attack: { hit: 'Попадание', miss: 'Промах' },
  save: { hit: 'Провал', miss: 'Успех' },
  none: { hit: 'Урон', miss: null },
};

// «модификатор Силы или Ловкости».
const abilityGenitive = (ability: AttackAbility | SaveDcAbility) =>
  ability === 'finesse'
    ? 'Силы или Ловкости'
    : ability === 'spellcasting'
      ? 'заклинательной характеристики'
      : ABILITY_GENITIVE[ability];

function formatTarget(target: StepTarget): string {
  switch (target.kind) {
    case 'self':
      return 'на себя';
    case 'touch':
      return 'касание';
    case 'reach':
      return `досягаемость ${target.feet} фт.`;
    case 'range':
      return target.longFeet
        ? `${target.feet}/${target.longFeet} фт.`
        : `${target.feet} фт.`;
    case 'area':
      return `${formatArea(target.area)} ${formatAreaOrigin(target.origin)}`;
  }
}

// Первая строка — проверка, вторая — её число (бонус атаки или Сл), если оно есть.
function checkLines(check: AbilityCheck): [string, string | null] {
  switch (check.kind) {
    case 'attack': {
      const { bonus } = check;
      const value =
        bonus.kind === 'fixed'
          ? `${bonus.value < 0 ? '−' : '+'}${Math.abs(bonus.value)}`
          : `модификатор ${abilityGenitive(bonus.ability)} + бонус мастерства`;
      return [ATTACK_KIND_LABELS[check.attack], `Бонус атаки: ${value}`];
    }
    case 'save': {
      const { dc } = check;
      const value =
        dc.kind === 'fixed'
          ? `Сл ${dc.value}`
          : `Сл 8 + модификатор ${abilityGenitive(dc.ability)} + бонус мастерства`;
      return [`Спасбросок ${ABILITY_GENITIVE[check.ability]}`, value];
    }
    case 'none':
      return ['Без проверки', null];
  }
}

// «1d8 Рубящий», «3 Дробящий», «1d6 + 2 Огонь».
export function formatDamagePart(part: DamagePart): string {
  const amount = [
    ...(part.count > 0 ? [`${part.count}d${part.die}`] : []),
    ...(part.number > 0 ? [String(part.number)] : []),
  ].join(' + ');
  return `${amount} ${DAMAGE_TYPE_LABELS[part.type]}`;
}

// Строки карточки: проверка и цель, бонус или Сл, первый исход, второй (если он что-то
// делает).
export function formatAbilityStep(step: AbilityStep): string[] {
  const [check, value] = checkLines(step.check);
  const labels = OUTCOME_LABELS[step.check.kind];
  const parts = step.hit.damage.map(formatDamagePart);
  if (step.hit.addModifier) parts.push('модификатор');
  return [
    `${check}, ${formatTarget(step.target)}`,
    ...(value ? [value] : []),
    `${labels.hit}: ${parts.length > 0 ? parts.join(' + ') : 'без урона'}`,
    ...(labels.miss && step.miss.damage === 'half'
      ? [`${labels.miss}: половина урона`]
      : []),
  ];
}
