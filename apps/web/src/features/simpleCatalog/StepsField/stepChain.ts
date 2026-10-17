import { nextLink, stepWhens, type StepLink } from 'shared';
import { checkOf, keepTarget, type StepValues } from './stepsForm';
import { fromTargetValues } from './stepTargetForm';

// Шаги формы цепочкой (shared/abilityStepLinks.ts): что каждому оставил прошлый шаг и
// какие «когда» и цели ему поэтому доступны.

const linkSource = (values: StepValues) => {
  const check = checkOf(values);
  return {
    check,
    target: fromTargetValues(
      values,
      check.kind === 'attack' ? check.attack : null,
    ),
  };
};

// Связь каждого шага с прошлым; у первого null.
export function chainLinks(steps: readonly StepValues[]): (StepLink | null)[] {
  const links: (StepLink | null)[] = [];
  steps.forEach((_step, index) => {
    links.push(
      index === 0
        ? null
        : nextLink(linkSource(steps[index - 1]), links[index - 1]),
    );
  });
  return links;
}

// Сверяет каждый шаг с прошлым, по порядку: «когда», которого больше нет (прошлый шаг
// стал без проверки, первый шаг удалили), — «Всегда»; цель, которая больше не подходит,
// — первая подходящая. Неизменный шаг остаётся тем же объектом: так видно, что
// исправлять нечего.
export function chainSteps(steps: readonly StepValues[]): StepValues[] {
  const fixed: StepValues[] = [];
  let link: StepLink | null = null;
  steps.forEach((step) => {
    let next = keepTarget(step, link);
    if (!stepWhens(link).includes(next.when))
      next = { ...next, when: 'always' };
    fixed.push(next);
    link = nextLink(linkSource(next), link);
  });
  return fixed;
}
