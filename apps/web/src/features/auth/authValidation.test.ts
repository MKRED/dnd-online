import { describe, expect, it } from 'vitest';
import {
  validateLogin,
  validateNickname,
  validatePassword,
} from './authValidation';

describe('validateLogin', () => {
  it('принимает латиницу, цифры и подчёркивание', () => {
    expect(validateLogin('player_01')).toBeNull();
  });

  it('требует минимум 3 символа', () => {
    expect(validateLogin('ab')).toBe('Минимум 3 символа');
  });

  it('отклоняет кириллицу и пробелы', () => {
    expect(validateLogin('игрок')).not.toBeNull();
    expect(validateLogin('my login')).not.toBeNull();
  });
});

describe('validateNickname', () => {
  it('не считает пробелы по краям символами', () => {
    expect(validateNickname('  a  ')).toBe('Минимум 2 символа');
    expect(validateNickname('Гэндальф')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('требует минимум 6 символов', () => {
    expect(validatePassword('12345')).not.toBeNull();
    expect(validatePassword('123456')).toBeNull();
  });
});
