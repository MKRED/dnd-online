// Вход в REST API: токен API или логин с паролем (куки).
export function parseArgs(argv) {
  const [api, ...rest] = argv;
  const opts = { api: api?.replace(/\/$/, '') };
  for (let i = 0; i < rest.length; i += 2)
    opts[rest[i].replace(/^--/, '')] = rest[i + 1];
  if (!opts.api || (!opts.token && !(opts.login && opts.password)))
    throw new Error('Нужно: <api> и --token или --login с --password');
  return opts;
}

export async function client({ api, token, login, password }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  else {
    const res = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) throw new Error(`Вход: ${res.status} ${await res.text()}`);
    headers.Cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  }
  return async (method, path, body) => {
    const res = await fetch(`${api}${path}`, {
      method,
      headers,
      body: body && JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
}
