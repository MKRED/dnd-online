import { describe, expect, it } from 'vitest';
import {
  applyHitPoints,
  creatureHealth,
  type HitPointsState,
} from './hitPoints.js';

const hp = (over: Partial<HitPointsState> = {}): HitPointsState => ({
  current: 6,
  max: 12,
  temp: 0,
  deathSuccesses: 0,
  deathFailures: 0,
  ...over,
});

describe('applyHitPoints — урон', () => {
  it('сначала временные хиты, остаток — в хиты (пример книги: 5 временных, 7 урона)', () => {
    expect(
      applyHitPoints(hp({ temp: 5 }), { kind: 'damage', amount: 7 }, true),
    ).toEqual({
      ok: true,
      instantDeath: false,
      state: hp({ temp: 0, current: 4 }),
    });
  });

  it('до нуля, остаток меньше максимума — без мгновенной смерти', () => {
    expect(
      applyHitPoints(hp(), { kind: 'damage', amount: 17 }, true),
    ).toMatchObject({ instantDeath: false, state: { current: 0 } });
  });

  it('пример книги: максимум 12, 6 хитов, 18 урона — смерть', () => {
    expect(
      applyHitPoints(hp(), { kind: 'damage', amount: 18 }, true),
    ).toMatchObject({
      instantDeath: true,
      state: { current: 0, deathFailures: 3 },
    });
  });

  it('урон на нуле — провал спасброска, стабильный снова бросает', () => {
    expect(
      applyHitPoints(
        hp({ current: 0, deathSuccesses: 3, deathFailures: 1 }),
        { kind: 'damage', amount: 3 },
        true,
      ),
    ).toMatchObject({
      instantDeath: false,
      state: { deathSuccesses: 0, deathFailures: 2 },
    });
  });

  it('крит на нуле — два провала', () => {
    expect(
      applyHitPoints(
        hp({ current: 0, deathFailures: 0 }),
        { kind: 'damage', amount: 3, critical: true },
        true,
      ),
    ).toMatchObject({ state: { deathFailures: 2 } });
  });

  it('урон на нуле не меньше максимума — смерть', () => {
    expect(
      applyHitPoints(hp({ current: 0 }), { kind: 'damage', amount: 12 }, true),
    ).toMatchObject({ instantDeath: true, state: { deathFailures: 3 } });
  });

  it('урон, целиком снятый временными хитами, на нуле провала не даёт', () => {
    expect(
      applyHitPoints(
        hp({ current: 0, temp: 5 }),
        { kind: 'damage', amount: 4 },
        true,
      ),
    ).toMatchObject({ state: { temp: 1, deathFailures: 0 } });
  });

  it('монстр: до нуля без спасбросков и мгновенной смерти', () => {
    expect(applyHitPoints(hp(), { kind: 'damage', amount: 40 }, false)).toEqual(
      {
        ok: true,
        instantDeath: false,
        state: hp({ current: 0 }),
      },
    );
  });
});

describe('applyHitPoints — лечение и прочее', () => {
  it('не выше максимума (пример книги: 14 из 20, лечение 8 — 20)', () => {
    expect(
      applyHitPoints(
        hp({ current: 14, max: 20 }),
        { kind: 'heal', amount: 8 },
        true,
      ),
    ).toMatchObject({ state: { current: 20 } });
  });

  it('лечение с нуля обнуляет спасброски', () => {
    expect(
      applyHitPoints(
        hp({ current: 0, deathSuccesses: 2, deathFailures: 1 }),
        { kind: 'heal', amount: 3 },
        true,
      ),
    ).toMatchObject({
      state: { current: 3, deathSuccesses: 0, deathFailures: 0 },
    });
  });

  it('мёртвого не вылечить', () => {
    expect(
      applyHitPoints(
        hp({ current: 0, deathFailures: 3 }),
        { kind: 'heal', amount: 3 },
        true,
      ),
    ).toEqual({ ok: false, reason: 'dead' });
  });

  it('временные хиты ставятся числом, не складываются', () => {
    expect(
      applyHitPoints(hp({ temp: 10 }), { kind: 'temp', amount: 12 }, true),
    ).toMatchObject({ state: { temp: 12 } });
  });

  it('спасброски — только у персонажа', () => {
    const change = {
      kind: 'death_saves',
      successes: 1,
      failures: 2,
    } as const;
    expect(applyHitPoints(hp(), change, true)).toMatchObject({
      state: { deathSuccesses: 1, deathFailures: 2 },
    });
    expect(applyHitPoints(hp(), change, false)).toEqual({
      ok: false,
      reason: 'no_death_saves',
    });
  });
});

describe('creatureHealth', () => {
  it('Ранен на половине хитов и ниже, на нуле — повержен, три провала — погиб', () => {
    expect(creatureHealth({ current: 7, max: 12, deathFailures: 0 })).toBe(
      null,
    );
    expect(creatureHealth({ current: 6, max: 12, deathFailures: 0 })).toBe(
      'bloodied',
    );
    expect(creatureHealth({ current: 0, max: 12, deathFailures: 2 })).toBe(
      'down',
    );
    expect(creatureHealth({ current: 0, max: 12, deathFailures: 3 })).toBe(
      'dead',
    );
  });
});
