import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Запросы только с API-токеном, без кук — так ходят MCP-серверы.
export type TokenClient = Record<Method, (path: string) => request.Test>;

export async function issueApiToken(
  app: NestExpressApplication,
  agent: request.Agent,
): Promise<TokenClient> {
  const res = await agent
    .post('/api/api-tokens')
    .send({ name: 'MCP' })
    .expect(201);
  const { token } = res.body as { token: string };
  const server = app.getHttpServer();
  const call = (method: Method) => (path: string) =>
    request(server)[method](path).set('Authorization', `Bearer ${token}`);
  return {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    patch: call('patch'),
    delete: call('delete'),
  };
}
