import type request from 'supertest';

export interface CreatedItem {
  id: string;
  name: string;
}

// Предмет каталога для тестов, которым нужны предметы (наборы, инвентарь).
export function itemBody(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Факел',
    category: 'basic',
    details: {},
    description: '',
    isPublic: false,
    rarity: 'none',
    weight: 1,
    cost: null,
    ...over,
  };
}

export async function createItem(
  agent: request.Agent,
  over: Record<string, unknown> = {},
): Promise<CreatedItem> {
  const res = await agent.post('/api/items').send(itemBody(over)).expect(201);
  return res.body as CreatedItem;
}

// Набор снаряжения из предметов с количествами.
export function packBody(
  contents: { itemId: string; quantity: number }[],
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return itemBody({
    name: 'Набор путешественника',
    category: 'pack',
    weight: 0,
    details: { contents },
    ...over,
  });
}
