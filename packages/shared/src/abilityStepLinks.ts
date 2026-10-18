import {
  isMeleeAttack,
  STEP_WHENS,
  type AbilityCheck,
  type AbilityCheckKind,
  type StepTarget,
  type StepTargetKind,
  type StepWhen,
} from './abilitySteps.js';

// Как шаг 2 и дальше опирается на прошлый (docs/plan/done/abilities.md, этап 5): «когда» —
// по исходу его проверки, «кого» — его цели. Ссылок на произвольные шаги и ветвлений
// нет: только на прошлый.

// Что прошлый шаг оставил следующему: свою проверку и кого задел — себя, одну цель
// (касание, досягаемость, дистанция) или многих (область, «она и все вокруг»). «Та же
// цель» наследует это от шага, на который сама ссылается. Повторы («Палящий луч» ×3)
// этого не меняют: следующий шаг срабатывает для каждого повтора отдельно — «та же
// цель» и «вокруг неё» — цель этого луча, «при попадании» — только попавшие лучи.
export type StepReach = 'self' | 'one' | 'many';
export interface StepLink {
  check: AbilityCheckKind;
  reach: StepReach;
}

const TARGET_REACH: Record<Exclude<StepTargetKind, 'previous'>, StepReach> = {
  self: 'self',
  touch: 'one',
  reach: 'one',
  range: 'one',
  area: 'many',
  around: 'many',
};

type LinkSource = { check: AbilityCheck; target: StepTarget };

// Связь для шага после step; link — связь самого step (null у первого).
export function nextLink(step: LinkSource, link: StepLink | null): StepLink {
  const { kind } = step.target;
  return {
    check: step.check.kind,
    // У первого шага «той же цели» быть не может; на всякий случай — одна цель.
    reach: kind === 'previous' ? (link?.reach ?? 'one') : TARGET_REACH[kind],
  };
}

// Связи всех шагов по порядку: у первого null.
export function stepLinks(steps: readonly LinkSource[]): (StepLink | null)[] {
  const links: (StepLink | null)[] = [];
  steps.forEach((step, index) => {
    links.push(
      index === 0 ? null : nextLink(steps[index - 1], links[index - 1]),
    );
  });
  return links;
}

// Когда может сработать шаг: первый — всегда; после шага без проверки исхода нет —
// тоже всегда.
export const stepWhens = (link: StepLink | null): StepWhen[] =>
  link === null || link.check === 'none' ? ['always'] : [...STEP_WHENS];

// Какие цели подходят проверке и прошлому шагу. Атака — касание и досягаемость у
// ближней, дистанция у дальнобойной. Спасбросок — кроме «на себя»: себе его не
// назначают. Без проверки — все. Цели прошлого шага — впереди, их выбирают чаще:
// «Та же цель» — если это не сам владелец под проверкой; «Она и все вокруг» — только
// вокруг одной цели и не атакой (атака по всем вокруг — это область).
export function stepTargets(
  check: AbilityCheck,
  link: StepLink | null = null,
): StepTargetKind[] {
  const own: StepTargetKind[] =
    check.kind === 'attack'
      ? isMeleeAttack(check.attack)
        ? ['touch', 'reach']
        : ['range']
      : check.kind === 'save'
        ? ['touch', 'reach', 'range', 'area']
        : ['self', 'touch', 'reach', 'range', 'area'];
  if (link === null) return own;
  const linked: StepTargetKind[] = [];
  if (link.reach !== 'self' || check.kind === 'none') linked.push('previous');
  if (link.reach === 'one' && check.kind !== 'attack') linked.push('around');
  return [...linked, ...own];
}
