const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export interface AuthUser {
  id: string;
  login: string;
  nickname: string;
}

export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ErrorBody {
  message?: string | string[];
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ErrorBody | null;
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Request failed');
    throw new AuthApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export function registerUser(input: {
  login: string;
  nickname: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  return post('/auth/register', input);
}

export function loginUser(input: {
  login: string;
  password: string;
}): Promise<{ user: AuthUser }> {
  return post('/auth/login', input);
}
