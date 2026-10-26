import { describe, expect, it } from 'vitest';
import {
  NICKNAME_CONTROL_MESSAGE,
  NICKNAME_LENGTH_MESSAGE,
  nicknameProblem,
  normalizeNickname,
} from './nickname.js';

describe('normalizeNickname', () => {
  it('обрезает края и сжимает пробелы внутри', () => {
    expect(normalizeNickname('  mk \t  red\n')).toBe('mk red');
  });
});

describe('nicknameProblem', () => {
  it('пропускает обычный ник, кириллицу и эмодзи', () => {
    expect(nicknameProblem('mk red')).toBeNull();
    expect(nicknameProblem('Гэндальф Серый')).toBeNull();
    expect(nicknameProblem('Арвен 🧝‍♀️')).toBeNull();
  });

  it('считает длину после обрезки пробелов', () => {
    expect(nicknameProblem('  a  ')).toBe(NICKNAME_LENGTH_MESSAGE);
    expect(nicknameProblem('ab')).toBeNull();
    expect(nicknameProblem('x'.repeat(32))).toBeNull();
    expect(nicknameProblem('x'.repeat(33))).toBe(NICKNAME_LENGTH_MESSAGE);
  });

  it('не пускает управляющие символы', () => {
    expect(nicknameProblem('mk\u0000red')).toBe(NICKNAME_CONTROL_MESSAGE);
  });
});
