import { formatArea, formatAreaOrigin } from './abilityStepAreas.js';
import { stepLinks, type StepLink } from './abilityStepLinks.js';
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
  StepWhen,
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
  previous: 'Та же цель',
  around: 'Она и все вокруг неё',
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

// «Когда» шага 2 и дальше — по исходу проверки прошлого шага (её вид — ключ). После
// шага без проверки исхода нет — только «Затем».
export const STEP_WHEN_LABELS: Record<
  AbilityCheckKind,
  Record<StepWhen, string>
> = {
  attack: { always: 'Затем', hit: 'При попадании', miss: 'При промахе' },
  save: { always: 'Затем', hit: 'При провале', miss: 'При успехе' },
  none: { always: 'Затем', hit: 'Затем', miss: 'Затем' },
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
    case 'previous':
      return 'та же цель';
    case 'around':
      return `цель и все в ${target.feet} фт. от неё`;
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

const lowerFirst = (text: string) => text[0].toLowerCase() + text.slice(1);

// Строки карточки: когда (у шага 2 и дальше), проверка, сколько раз и цель, бонус или
// Сл, первый исход, второй (если он что-то делает). link — связь с прошлым шагом
// (abilityStepLinks.ts), у первого null.
export function formatAbilityStep(
  step: AbilityStep,
  link: StepLink | null = null,
): string[] {
  const [check, value] = checkLines(step.check);
  const labels = OUTCOME_LABELS[step.check.kind];
  const parts = step.hit.damage.map(formatDamagePart);
  if (step.hit.addModifier) parts.push('модификатор');
  const times = step.times > 1 ? ` ×${step.times}` : '';
  const head = `${check}${times}, ${formatTarget(step.target)}`;
  return [
    link
      ? `${STEP_WHEN_LABELS[link.check][step.when]} — ${lowerFirst(head)}`
      : head,
    ...(value ? [value] : []),
    `${labels.hit}: ${parts.length > 0 ? parts.join(' + ') : 'без урона'}`,
    ...(labels.miss && step.miss.damage === 'half'
      ? [`${labels.miss}: половина урона`]
      : []),
  ];
}

// Строки всех шагов по порядку, со связями.
export function formatAbilitySteps(steps: readonly AbilityStep[]): string[][] {
  const links = stepLinks(steps);
  return steps.map((step, index) => formatAbilityStep(step, links[index]));
}
