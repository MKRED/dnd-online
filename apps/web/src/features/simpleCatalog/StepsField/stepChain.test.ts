import { describe, expect, it } from 'vitest';
import { chainLinks, chainSteps } from './stepChain';
import { fromStepValues, newStep, type StepValues } from './stepsForm';
import { stepsValidate } from './stepsValidate';

const step = (patch: Partial<StepValues>): StepValues => ({
  ...newStep(),
  ...patch,
});
// «Ледяной кинжал»: атака, затем спасбросок цели и всех в 5 фт. от неё.
const knife = step({});
const burst = step({ when: 'hit', check: 'save', target: 'around' });

describe('stepChain', () => {
  it('связи: проверка и кого задел прошлый шаг', () => {
    expect(chainLinks([knife, burst])).toEqual([
      null,
      { check: 'attack', reach: 'one' },
    ]);
    // «Та же цель» наследует, кого задел шаг, на который ссылается.
    const self = step({ check: 'none', target: 'self' });
    const same = step({ check: 'none', target: 'previous' });
    expect(chainLinks([self, same, same])[2]).toEqual({
      check: 'none',
      reach: 'self',
    });
  });

  it('верная цепочка не меняется', () => {
    const steps = [knife, burst];
    const fixed = chainSteps(steps);
    expect(fixed[0]).toBe(knife);
    expect(fixed[1]).toBe(burst);
  });

  it('прошлый шаг без проверки — «когда» становится «всегда»', () => {
    const none = step({ check: 'none' });
    expect(chainSteps([none, burst])[1].when).toBe('always');
  });

  it('удалили первый шаг — у нового первого нет целей прошлого', () => {
    const [first] = chainSteps([burst]);
    expect(first).toMatchObject({ when: 'always', target: 'touch' });
  });

  it('«вокруг» после области сменяется на «ту же цель»', () => {
    const area = step({ check: 'save', target: 'area' });
    expect(chainSteps([area, burst])[1].target).toBe('previous');
  });

  // Следующий шаг срабатывает для каждого повтора отдельно — «вокруг» остаётся.
  it('после повторов «вокруг» остаётся', () => {
    const rays = step({ times: 3 });
    expect(chainSteps([rays, burst])[1].target).toBe('around');
  });

  it('уходит в запрос цепочкой', () => {
    const steps = chainSteps([knife, { ...burst, times: 3 }]).map(
      fromStepValues,
    );
    expect(steps[1]).toMatchObject({
      when: 'hit',
      times: 3,
      target: { kind: 'around', feet: 5 },
    });
  });

  it('проверки: сколько раз и футы вокруг', () => {
    const form = { steps: [knife, burst] };
    expect(stepsValidate.times(0)).toBe('От 1 до 20');
    expect(stepsValidate.times('')).toBe('От 1 до 20');
    expect(stepsValidate.times(3)).toBeNull();
    expect(stepsValidate.aroundFeet(7, form, 'steps.1.aroundFeet')).toBe(
      'Кратно 5, от 5 до 60',
    );
    // У шага, цель которого не «вокруг», не проверяется.
    expect(stepsValidate.aroundFeet('', form, 'steps.0.aroundFeet')).toBeNull();
  });
});
