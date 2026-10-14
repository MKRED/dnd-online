// Куда вернуть человека после входа: ссылку на персонажа открыли без входа, вход и
// регистрация (в том числе через лольку) должны привести обратно на неё.
// Пускаем только пути своего сайта, иначе адрес входа стал бы открытым редиректом:
// «//evil.example», «/\evil.example» и «https://…» браузер уводит на чужой сайт.
const MAX_LENGTH = 500;

// Обратную косую и управляющие символы браузеры местами читают как «//».
const isUnsafeChar = (char: string) =>
  char === '\\' || char.charCodeAt(0) < 0x20;

export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if ([...value].some(isUnsafeChar)) return null;
  // Вернуть на страницу входа — значит зациклить вход.
  if (/^\/(login|register)(?=[/?#]|$)/.test(value)) return null;
  return value;
}
