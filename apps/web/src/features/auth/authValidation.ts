import { nicknameProblem } from 'shared';

const LOGIN_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateLogin(value: string): string | null {
  if (value.trim().length < 3) return 'Минимум 3 символа';
  return LOGIN_PATTERN.test(value)
    ? null
    : 'Только латинские буквы, цифры и подчёркивание';
}

// Правила те же, что у сервера (shared/nickname): при регистрации и при смене ника.
export function validateNickname(value: string): string | null {
  return nicknameProblem(value);
}

export function validatePassword(value: string): string | null {
  return value.length >= 6
    ? null
    : 'Пароль должен содержать минимум 6 символов';
}
