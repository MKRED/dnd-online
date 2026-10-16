import { describe, expect, it } from 'vitest';
import { readEffectComponents } from './effectComponentsRead.js';

const dark = { kind: 'sense', sense: 'darkvision', range: 60 };
const longstrider = { kind: 'speed', change: 'faster', feet: 10, hover: false };

describe('readEffectComponents', () => {
  it('целые составляющие читает как есть', () => {
    expect(readEffectComponents([dark, longstrider])).toEqual([
      dark,
      longstrider,
    ]);
  });

  it('недостающие поля заполняет умолчаниями', () => {
    expect(
      readEffectComponents([
        { kind: 'speed', change: 'fly', feet: 60 },
        { kind: 'advantage', mode: 'advantage', roll: 'attacked' },
        { kind: 'defense', level: 'resistance', damageTypes: ['fire'] },
      ]),
    ).toEqual([
      { kind: 'speed', change: 'fly', feet: 60, hover: false },
      { kind: 'advantage', mode: 'advantage', roll: 'attacked', ability: null },
      {
        kind: 'defense',
        level: 'resistance',
        damageTypes: ['fire'],
        conditions: [],
      },
    ]);
  });

  it('испорченную составляющую и повтор пропускает, остальные оставляет', () => {
    expect(
      readEffectComponents([
        { kind: 'aura' },
        null,
        dark,
        { ...dark, range: 120 },
        { kind: 'speed', change: 'faster' },
        { kind: '__proto__' },
        longstrider,
      ]),
    ).toEqual([dark, longstrider]);
  });

  it('не список — эффект без составляющих', () => {
    expect(readEffectComponents(undefined)).toEqual([]);
    expect(readEffectComponents({ 0: dark })).toEqual([]);
  });
});
