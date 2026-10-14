import { createHash, randomBytes } from 'crypto';

// Случайная строка в base64url: и `state`, и `code_verifier` (43 символа — минимум RFC 7636).
export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// code_challenge = BASE64URL(SHA256(code_verifier)) без «=» — так требует лолька (S256).
export function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
