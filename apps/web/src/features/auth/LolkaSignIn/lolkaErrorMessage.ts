// Сервер при неудачном входе через лольку возвращает на /login?lolkaError=<код>.
const MESSAGES: Record<string, string> = {
  denied: 'Вход через лольку отменён.',
  state:
    'Вход через лольку не завершился — возможно, он начат слишком давно. Попробуйте ещё раз.',
  rate_limited: 'Слишком много попыток, попробуйте позже.',
};

export function lolkaErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? 'Не удалось войти через лольку, попробуйте ещё раз.';
}
