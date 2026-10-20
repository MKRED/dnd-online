// Значение cookie из заголовка рукопожатия сокета. cookie-parser работает только для
// HTTP-маршрутов Express, рукопожатие Socket.IO его не проходит.
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    const value = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      // Битое %-кодирование — такой cookie не наш токен.
      return undefined;
    }
  }
  return undefined;
}
