import { describe, expect, it } from 'vitest';
import type { EffectComponent } from '../effectComponents.js';
import type { AppliedEffect } from '../effectSpeedTotal.js';
import { attackOutcome } from './attackHit.js';
import {
  attackRollInput,
  REASON_DODGING,
  REASON_ENEMY_CLOSE,
  REASON_HEAVY,
  REASON_LONG_RANGE,
  type AttackSituation,
} from './attackRoll.js';
import { zeroHitPointsEffect } from './fighterConditions.js';

const effect = (
  source: string,
  ...components: EffectComponent[]
): AppliedEffect => ({ source, components });
const condition = (
  c: Extract<EffectComponent, { kind: 'condition' }>['condition'],
) => effect(`src-${c}`, { kind: 'condition', condition: c });
const fighter = (...effects: AppliedEffect[]) => ({
  effects,
  nameOf: (source: string) => source,
});

const melee = {
  kind: 'melee' as const,
  terms: [{ kind: 'number' as const, label: 'Сила', amount: 3 }],
  heavyDisadvantage: false,
};

function situation(more: Partial<AttackSituation> = {}): AttackSituation {
  return {
    option: melee,
    distance: 5,
    band: 'normal',
    attacker: fighter(),
    target: fighter(),
    enemyClose: false,
    targetDodging: false,
    ...more,
  };
}

describe('бросок атаки', () => {
  it('без причин — только слагаемые атаки', () => {
    expect(attackRollInput(situation())).toEqual({
      terms: melee.terms,
      reasons: { advantage: [], disadvantage: [] },
    });
  });

  it('Благословение — 1к4 к броску, Отравленный — помеха', () => {
    const input = attackRollInput(
      situation({
        attacker: fighter(
          effect('Благословение', {
            kind: 'roll_bonus',
            mode: 'bonus',
            roll: 'attack',
            ability: null,
            count: 1,
            die: 4,
            number: 0,
            damageType: null,
          }),
          condition('poisoned'),
        ),
      }),
    );
    expect(input.terms[1]).toEqual({
      kind: 'dice',
      label: 'Благословение',
      count: 1,
      die: 4,
      sign: 1,
    });
    expect(input.reasons.disadvantage).toEqual(['condition:poisoned']);
  });

  it('Опрокинутая цель: вблизи преимущество, издалека помеха', () => {
    const target = fighter(condition('prone'));
    expect(attackRollInput(situation({ target })).reasons.advantage).toEqual([
      'condition:prone',
    ]);
    expect(
      attackRollInput(situation({ target, distance: 30 })).reasons.disadvantage,
    ).toEqual(['condition:prone']);
  });

  it('дальняя дистанция, враг вплотную и Тяжёлое — помеха с причинами', () => {
    const input = attackRollInput(
      situation({
        option: { ...melee, kind: 'ranged', heavyDisadvantage: true },
        band: 'long',
        enemyClose: true,
      }),
    );
    expect(input.reasons.disadvantage).toEqual([
      REASON_LONG_RANGE,
      REASON_ENEMY_CLOSE,
      REASON_HEAVY,
    ]);
  });

  it('уклонение цели — помеха, если цель видит атакующего и дееспособна', () => {
    expect(
      attackRollInput(situation({ targetDodging: true })).reasons.disadvantage,
    ).toEqual([REASON_DODGING]);
    const invisible = fighter(condition('invisible'));
    expect(
      attackRollInput(situation({ targetDodging: true, attacker: invisible }))
        .reasons.disadvantage,
    ).toEqual([]);
    expect(
      attackRollInput(
        situation({
          targetDodging: true,
          target: fighter(condition('stunned')),
        }),
      ).reasons.disadvantage,
    ).toEqual([]);
  });

  it('герой на 0 хитов — Без сознания: по нему с преимуществом', () => {
    const input = attackRollInput(
      situation({ target: fighter(zeroHitPointsEffect) }),
    );
    expect(input.reasons.advantage).toContain('condition:unconscious');
  });
});

describe('попадание', () => {
  const roll = (natural: number, total: number) => ({
    dice: [natural],
    kept: 0,
    total,
  });
  it('итог против КД; 20 — крит при любом КД, 1 — промах при любом', () => {
    expect(attackOutcome(roll(10, 15), 15)).toBe('hit');
    expect(attackOutcome(roll(10, 14), 15)).toBe('miss');
    expect(attackOutcome(roll(20, 21), 30)).toBe('critical');
    expect(attackOutcome(roll(1, 30), 10)).toBe('miss');
  });
  it('по Парализованному вблизи любое попадание — крит', () => {
    expect(attackOutcome(roll(12, 17), 15, true)).toBe('critical');
    expect(attackOutcome(roll(5, 10), 15, true)).toBe('miss');
  });
});
