const LOGIN_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateLogin(value: string): string | null {
  if (value.trim().length < 3) return 'Минимум 3 символа';
  return LOGIN_PATTERN.test(value)
    ? null
    : 'Только латинские буквы, цифры и подчёркивание';
}

export function validateNickname(value: string): string | null {
  return value.trim().length >= 2 ? null : 'Минимум 2 символа';
}

export function validatePassword(value: string): string | null {
  return value.length >= 6
    ? null
    : 'Пароль должен содержать минимум 6 символов';
}
