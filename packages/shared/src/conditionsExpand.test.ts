import { describe, expect, it } from 'vitest';
import { expandConditions } from './conditionsExpand.js';
import type { EffectComponent } from './effectComponents.js';
import type { ConditionKind } from './effectConditions.js';
import { totalSpeed, type AppliedEffect } from './effectSpeedTotal.js';

const condition = (source: string, kind: ConditionKind): AppliedEffect => ({
  source,
  components: [{ kind: 'condition', condition: kind }],
});
const longstrider: AppliedEffect = {
  source: 'longstrider',
  components: [{ kind: 'speed', change: 'faster', feet: 10, hover: false }],
};
const haste: AppliedEffect = {
  source: 'haste',
  components: [{ kind: 'speed', change: 'double', feet: null, hover: false }],
};
const immuneTo = (kind: ConditionKind): AppliedEffect => ({
  source: 'freedom',
  components: [
    { kind: 'defense', level: 'immunity', damageTypes: [], conditions: [kind] },
  ] satisfies EffectComponent[],
});
const sources = (effects: AppliedEffect[]) =>
  expandConditions(effects)
    .map((e) => e.source)
    .filter((s) => s.startsWith('condition:'));
const walk = (effects: AppliedEffect[]) =>
  totalSpeed({ speed: 30, special: { fly: 60 } }, effects);

describe('expandConditions', () => {
  it('состояние раскрывается вместе с включёнными', () => {
    expect(sources([condition('sleep', 'unconscious')])).toEqual([
      'condition:unconscious',
      'condition:incapacitated',
      'condition:prone',
    ]);
  });

  it('одно состояние из двух эффектов — один экземпляр', () => {
    expect(
      sources([condition('a', 'grappled'), condition('b', 'grappled')]),
    ).toEqual(['condition:grappled']);
  });

  it('иммунитет к состоянию — его нет, в том числе от другого состояния', () => {
    expect(sources([condition('a', 'grappled'), immuneTo('grappled')])).toEqual(
      [],
    );
    expect(
      sources([condition('a', 'petrified'), condition('b', 'poisoned')]),
    ).toEqual(['condition:petrified', 'condition:incapacitated']);
  });
});

describe('totalSpeed с состояниями', () => {
  it('Схваченный, Опутанный под Haste и Longstrider, Бессознательный — 0', () => {
    expect(walk([condition('a', 'grappled')]).speed).toBe(0);
    expect(
      walk([condition('a', 'restrained'), haste, longstrider]),
    ).toMatchObject({ speed: 0, special: { fly: 0 } });
    expect(walk([condition('a', 'unconscious')]).speed).toBe(0);
  });

  it('иммунитет к «Схваченному» — Скорость не меняется', () => {
    expect(walk([condition('a', 'grappled'), immuneTo('grappled')]).speed).toBe(
      30,
    );
  });

  // Истощение копится, даже из одной записи каталога: два раза — −10 фт.
  it('Истощение дважды — −10 фт., и у особых скоростей', () => {
    expect(
      walk([condition('a', 'exhaustion'), condition('a', 'exhaustion')]),
    ).toMatchObject({ speed: 20, special: { fly: 50 } });
  });
});
