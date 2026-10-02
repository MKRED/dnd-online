import type { ApiTokenInfo, CreatedApiToken } from 'shared';
import { apiRequest } from '../../lib/apiRequest';

export function listApiTokens(): Promise<ApiTokenInfo[]> {
  return apiRequest('/api-tokens');
}

export function createApiToken(name: string): Promise<CreatedApiToken> {
  return apiRequest('/api-tokens', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function revokeApiToken(id: string): Promise<void> {
  return apiRequest(`/api-tokens/${id}`, { method: 'DELETE' });
}
