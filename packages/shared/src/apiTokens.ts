// API-токены для внешних клиентов (MCP-сервер карты) — ответы HTTP API.

export interface ApiTokenInfo {
  id: string;
  name: string;
  // Начало токена, чтобы отличать токены в списке; сам токен сервер больше не покажет.
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// Ответ на создание: единственный момент, когда виден сам токен.
export interface CreatedApiToken {
  token: string;
  info: ApiTokenInfo;
}
