import { createHash, randomBytes } from 'crypto';

// Узнаваемый префикс: по нему видно, что это токен DnD Online (и его легко найти,
// если он случайно попал в лог или репозиторий).
const TOKEN_PREFIX = 'dnd_';
const DISPLAY_LENGTH = TOKEN_PREFIX.length + 8;

export function generateApiToken(): { token: string; prefix: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  return { token, prefix: token.slice(0, DISPLAY_LENGTH) };
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function looksLikeApiToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}
