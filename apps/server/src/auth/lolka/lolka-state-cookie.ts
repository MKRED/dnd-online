import type { CookieOptions, Request, Response } from 'express';

// state и code_verifier живут между уходом на лольку и возвратом. Серверных сессий
// у нас нет, поэтому — httpOnly cookie только для путей входа через лольку.
// sameSite=lax: возврат с лольки — переход верхнего уровня методом GET, cookie придёт.
const COOKIE = 'lolka_oauth';
const MAX_AGE_MS = 10 * 60_000;

export interface LolkaPending {
  state: string;
  verifier: string;
}

function options(secure: boolean, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/lolka',
    maxAge,
  };
}

export function setPendingCookie(
  res: Response,
  pending: LolkaPending,
  secure: boolean,
): void {
  const value = Buffer.from(JSON.stringify(pending)).toString('base64url');
  res.cookie(COOKIE, value, options(secure, MAX_AGE_MS));
}

// Cookie одноразовая: читаем и сразу стираем, чтобы повтор адреса возврата не прошёл.
export function takePendingCookie(
  req: Request,
  res: Response,
  secure: boolean,
): LolkaPending | null {
  const raw = (req.cookies as Record<string, string> | undefined)?.[COOKIE];
  res.clearCookie(COOKIE, options(secure, 0));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<LolkaPending>;
    return typeof parsed.state === 'string' &&
      typeof parsed.verifier === 'string'
      ? { state: parsed.state, verifier: parsed.verifier }
      : null;
  } catch {
    // Испорченная cookie — то же, что её отсутствие: вход начнётся заново.
    return null;
  }
}
