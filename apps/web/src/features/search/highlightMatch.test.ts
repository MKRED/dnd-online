import { describe, expect, it } from 'vitest';
import { highlightMatch } from './highlightMatch';

describe('highlightMatch', () => {
  it('выделяет первое вхождение без учёта регистра и сохраняет написание', () => {
    expect(highlightMatch('Ганс «Огнебород»', 'огн')).toEqual([
      { text: 'Ганс «', match: false },
      { text: 'Огн', match: true },
      { text: 'ебород»', match: false },
    ]);
  });

  it('в начале названия — без пустой части', () => {
    expect(highlightMatch('Огниво', ' ОГН ')).toEqual([
      { text: 'Огн', match: true },
      { text: 'иво', match: false },
    ]);
  });

  it('не нашлось или пустой запрос — название целиком', () => {
    expect(highlightMatch('Лёд', 'огн')).toEqual([
      { text: 'Лёд', match: false },
    ]);
    expect(highlightMatch('Лёд', '')).toEqual([{ text: 'Лёд', match: false }]);
  });
});
