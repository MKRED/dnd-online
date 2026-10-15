import type request from 'supertest';
import { characterBody } from './character-fixture.js';

export interface InventoryRow {
  id: string;
  location: 'carried' | 'stash';
  quantity: number;
  item: { id: string; name: string } | null;
  missing: 'hidden' | 'deleted' | null;
  inactive?: boolean;
}

export async function createCharacter(agent: request.Agent): Promise<string> {
  const res = await agent
    .post('/api/characters')
    .send(characterBody())
    .expect(201);
  return (res.body as { id: string }).id;
}

export const inventoryUrl = (characterId: string) =>
  `/api/characters/${characterId}/items`;

// Инвентарь приходит вместе с листом — так, как его видит agent.
export async function readInventory(
  agent: request.Agent,
  characterId: string,
): Promise<InventoryRow[]> {
  const res = await agent.get(`/api/characters/${characterId}`).expect(200);
  return (res.body as { inventory: InventoryRow[] }).inventory;
}
