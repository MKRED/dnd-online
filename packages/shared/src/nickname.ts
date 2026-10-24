// Ник — имя, под которым игрока видят другие: в шапке, лобби, журнале игры и у его
// записей в каталоге. Не уникален: уникален логин, а вход через лольку даёт ник
// «Игрок» многим сразу.
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 32;

export const NICKNAME_LENGTH_MESSAGE = `Ник — от ${NICKNAME_MIN} до ${NICKNAME_MAX} знаков`;
export const NICKNAME_CONTROL_MESSAGE =
  'В нике не должно быть служебных символов';

// Без управляющих символов (\p{Cc}): невидимые, они ломали бы строку в журнале. Знаки
// форматирования (Cf) пропускаем — на них держатся составные эмодзи.
export const NICKNAME_PATTERN = /^\P{Cc}*$/u;

// Пробелы по краям обрезаются, подряд идущие (и переводы строк) сжимаются в один:
// иначе два с виду одинаковых ника различались бы невидимым.
export function normalizeNickname(raw: string): string {
  return raw.replace(/\s+/gu, ' ').trim();
}

// null — ник годится; иначе текст ошибки для формы. Сервер проверяет то же самое.
export function nicknameProblem(raw: string): string | null {
  const nickname = normalizeNickname(raw);
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return NICKNAME_LENGTH_MESSAGE;
  }
  return NICKNAME_PATTERN.test(nickname) ? null : NICKNAME_CONTROL_MESSAGE;
}
