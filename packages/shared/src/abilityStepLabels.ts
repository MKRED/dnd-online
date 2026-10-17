import type {
  AbilityStep,
  AttackAbility,
  AttackKind,
  DamagePart,
  StepTarget,
  StepTargetKind,
} from './abilitySteps.js';
import { ABILITY_GENITIVE } from './abilityUsageLabels.js';
import { DAMAGE_TYPE_LABELS } from './damageTypes.js';

// Тексты шагов «Применения» для формы и карточки (docs/dnd/attacks-and-saves.md).

export const ATTACK_KIND_LABELS: Record<AttackKind, string> = {
  melee_weapon: 'Ближняя атака оружием',
  ranged_weapon: 'Дальнобойная атака оружием',
  melee_spell: 'Ближняя атака заклинанием',
  ranged_spell: 'Дальнобойная атака заклинанием',
};

export const STEP_TARGET_LABELS: Record<StepTargetKind, string> = {
  touch: 'Касание',
  reach: 'Досягаемость',
  range: 'Дистанция',
};

// «модификатор Силы или Ловкости».
const abilityGenitive = (ability: AttackAbility) =>
  ability === 'finesse'
    ? 'Силы или Ловкости'
    : ability === 'spellcasting'
      ? 'заклинательной характеристики'
      : ABILITY_GENITIVE[ability];

function formatTarget(target: StepTarget): string {
  switch (target.kind) {
    case 'touch':
      return 'касание';
    case 'reach':
      return `досягаемость ${target.feet} фт.`;
    case 'range':
      return target.longFeet
        ? `${target.feet}/${target.longFeet} фт.`
        : `${target.feet} фт.`;
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

// Строки карточки: атака и цель, бонус, попадание, промах (если он что-то делает).
export function formatAbilityStep(step: AbilityStep): string[] {
  const { check } = step;
  const bonus =
    check.bonus.kind === 'fixed'
      ? `${check.bonus.value < 0 ? '−' : '+'}${Math.abs(check.bonus.value)}`
      : `модификатор ${abilityGenitive(check.bonus.ability)} + бонус мастерства`;
  const parts = step.hit.damage.map(formatDamagePart);
  if (step.hit.addModifier) parts.push('модификатор');
  return [
    `${ATTACK_KIND_LABELS[check.attack]}, ${formatTarget(step.target)}`,
    `Бонус атаки: ${bonus}`,
    `Попадание: ${parts.length > 0 ? parts.join(' + ') : 'без урона'}`,
    ...(step.miss.damage === 'half' ? ['Промах: половина урона'] : []),
  ];
}
