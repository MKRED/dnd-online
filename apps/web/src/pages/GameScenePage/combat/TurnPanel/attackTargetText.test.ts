import type { AttackTarget } from 'shared';
import { describe, expect, it } from 'vitest';
import { targetMark } from './attackTargetText';

const target = (over: Partial<AttackTarget> = {}): AttackTarget => ({
  ref: { kind: 'creature', objectId: 2 },
  name: 'Гоблин',
  ally: false,
  distance: 25,
  band: 'normal',
  cover: 'half',
  roll: { terms: [], reasons: { advantage: [], disadvantage: [] } },
  armorClass: 15,
  ...over,
});

const reasons = (advantage: string[], disadvantage: string[]) => ({
  roll: { terms: [], reasons: { advantage, disadvantage } },
});

describe('targetMark', () => {
  it('можно: имя и расстояние, без укрытия и КД', () => {
    expect(targetMark(target())).toEqual({
      tone: 'normal',
      label: '✓ Гоблин · 25 фт.',
    });
  });

  it('вне досягаемости — «не достать», красная', () => {
    expect(targetMark(target({ band: 'out', distance: 45 }))).toEqual({
      tone: 'out',
      label: '✕ Гоблин · 45 фт. · не достать',
    });
  });

  it('помеха — оранжевая, преимущество — зелёная, вместе гасят друг друга', () => {
    expect(
      targetMark(
        target({ band: 'long', ...reasons([], ['Дальняя дистанция']) }),
      ),
    ).toEqual({ tone: 'disadvantage', label: '✓ Гоблин · 25 фт. · помеха' });
    expect(targetMark(target(reasons(['Опрокинутый'], [])))).toEqual({
      tone: 'normal',
      label: '✓ Гоблин · 25 фт. · преимущество',
    });
    expect(
      targetMark(target(reasons(['Опрокинутый'], ['Враг вплотную']))),
    ).toEqual({ tone: 'normal', label: '✓ Гоблин · 25 фт.' });
  });

  it('свой — отмечен', () => {
    expect(targetMark(target({ ally: true, name: 'Лира' })).label).toBe(
      '✓ Лира · 25 фт. · свой',
    );
  });
});
