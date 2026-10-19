import { DEFAULT_MONSTER_STAT_BLOCK } from 'shared';
import type request from 'supertest';

// Монстр каталога для тестов его связей: способностей, снаряжения, эффектов.
export function monsterBody(isPublic = false): Record<string, unknown> {
  return {
    name: 'Аболет',
    category: 'aberration',
    statBlock: DEFAULT_MONSTER_STAT_BLOCK,
    role: 'unique',
    description: '',
    sources: [],
    isPublic,
  };
}

export async function createMonster(
  agent: request.Agent,
  isPublic = false,
): Promise<string> {
  const res = await agent
    .post('/api/monsters')
    .send(monsterBody(isPublic))
    .expect(201);
  return (res.body as { id: string }).id;
}
