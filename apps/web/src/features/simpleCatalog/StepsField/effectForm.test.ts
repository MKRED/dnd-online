import type { Effect } from 'shared';
import { describe, expect, it } from 'vitest';
import { effectCandidates, effectOptions, toStepEffect } from './effectOptions';
import { fromStepValues, newStep } from './stepsForm';
import { stepsValidate } from './stepsValidate';

const effect = (id: string, name: string, authorId: string) =>
  ({
    id,
    name,
    authorId,
    authorNickname: authorId,
    isPublic: true,
    image: null,
  }) as unknown as Effect;

describe('эффекты в форме шага', () => {
  it('варианты: свои и чужие из каталога, без уже выбранных', () => {
    const mine = [effect('a', 'Отравлен', 'me')];
    const catalog = [mine[0], effect('b', 'Горение', 'other')];
    const candidates = effectCandidates(mine, catalog, 'me');
    expect(candidates.others.map((e) => e.id)).toEqual(['b']);
    expect(effectOptions(candidates, [toStepEffect(mine[0])])).toEqual([
      { group: 'Каталог', items: [{ value: 'b', label: 'Горение · other' }] },
    ]);
  });

  it('в запрос уходят только id; без проверки — без эффектов при промахе', () => {
    const step = {
      ...newStep(),
      hitEffects: [toStepEffect(effect('a', 'Отравлен', 'me'))],
      missEffects: [toStepEffect(effect('b', 'Горение', 'me'))],
    };
    expect(fromStepValues(step)).toMatchObject({
      hit: { effects: [{ effectId: 'a' }] },
      miss: { effects: [{ effectId: 'b' }] },
    });
    expect(fromStepValues(step).hit.effects[0]).not.toHaveProperty('effect');
    expect(fromStepValues({ ...step, check: 'none' }).miss.effects).toEqual([]);
  });

  it('эффект, скрытый автором, просит убрать', () => {
    const hidden = [{ effectId: 'x', effect: null }];
    expect(stepsValidate.hitEffects(hidden)).toBe(
      'Эффект скрыт автором — уберите его',
    );
    expect(stepsValidate.hitEffects([])).toBeNull();
    const form = { steps: [{ ...newStep(), check: 'none' as const }] };
    expect(
      stepsValidate.missEffects(hidden, form, 'steps.0.missEffects'),
    ).toBeNull();
  });
});
