import { describe, expect, it } from 'vitest';
import { formatSense, isSenseDetails } from './effectSenses.js';

describe('effectSenses', () => {
  it('принимает чувство с дистанцией и видение невидимого без неё', () => {
    expect(isSenseDetails({ sense: 'darkvision', range: 60 })).toBe(true);
    expect(isSenseDetails({ sense: 'truesight', range: 1000 })).toBe(true);
    expect(isSenseDetails({ sense: 'see_invisible', range: null })).toBe(true);
  });

  it('требует дистанцию, кратную 5, у чувств с дистанцией', () => {
    expect(isSenseDetails({ sense: 'darkvision', range: null })).toBe(false);
    expect(isSenseDetails({ sense: 'darkvision', range: 0 })).toBe(false);
    expect(isSenseDetails({ sense: 'darkvision', range: 62 })).toBe(false);
    expect(isSenseDetails({ sense: 'darkvision', range: 1005 })).toBe(false);
    expect(isSenseDetails({ sense: 'darkvision', range: '60' })).toBe(false);
  });

  it('не пускает дистанцию у видения невидимого, чужие поля и неизвестный вид', () => {
    expect(isSenseDetails({ sense: 'see_invisible', range: 60 })).toBe(false);
    expect(isSenseDetails({ sense: 'echolocation', range: 60 })).toBe(false);
    expect(isSenseDetails({ sense: 'blindsight', range: 10, x: 1 })).toBe(
      false,
    );
    expect(isSenseDetails({ sense: 'blindsight' })).toBe(false);
    expect(isSenseDetails(null)).toBe(false);
  });

  it('пишет вид и дистанцию', () => {
    expect(formatSense({ sense: 'tremorsense', range: 60 })).toBe(
      'Чувство вибрации, 60 фт.',
    );
    expect(formatSense({ sense: 'see_invisible', range: null })).toBe(
      'Видение невидимого',
    );
  });
});
