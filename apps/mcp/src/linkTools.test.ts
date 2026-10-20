import { describe, expect, it, vi } from 'vitest';
import type { ApiCall } from './apiClient.js';
import { call, connect } from './testing/mcpClient.js';

const OWNER = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const ENTRY = '33333333-3333-4333-8333-333333333333';

async function run(
  api: ReturnType<typeof vi.fn>,
  name: string,
  args: Record<string, unknown>,
) {
  const client = await connect(api as unknown as ApiCall);
  return call(client, name, args);
}

describe('link_add', () => {
  it('предмет персонажу — по умолчанию одна штука при себе', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'link_add', {
      owner: 'character',
      ownerId: OWNER,
      target: 'item',
      targetId: TARGET,
    });
    expect(api).toHaveBeenCalledWith(`/characters/${OWNER}/items`, {
      method: 'POST',
      body: { quantity: 1, location: 'carried', itemId: TARGET },
    });
  });

  it('НПС — тот же адрес персонажей', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'link_add', {
      owner: 'npc',
      ownerId: OWNER,
      target: 'effect',
      targetId: TARGET,
    });
    expect(api).toHaveBeenCalledWith(`/characters/${OWNER}/effects`, {
      method: 'POST',
      body: { effectId: TARGET },
    });
  });

  it('способность монстру — с perDay', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'link_add', {
      owner: 'monster',
      ownerId: OWNER,
      target: 'ability',
      targetId: TARGET,
      perDay: 2,
    });
    expect(api).toHaveBeenCalledWith(`/monsters/${OWNER}/abilities`, {
      method: 'POST',
      body: { perDay: 2, abilityId: TARGET },
    });
  });

  it('поле, которого у связи нет, — ошибка без запроса', async () => {
    const api = vi.fn();
    const result = await run(api, 'link_add', {
      owner: 'monster',
      ownerId: OWNER,
      target: 'item',
      targetId: TARGET,
      location: 'stash',
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('нет поля location');
    expect(api).not.toHaveBeenCalled();
  });
});

describe('link_update', () => {
  it('отмечает подготовленное заклинание персонажа', async () => {
    const api = vi.fn().mockResolvedValue({});
    await run(api, 'link_update', {
      owner: 'character',
      ownerId: OWNER,
      target: 'ability',
      entryId: ENTRY,
      prepared: true,
    });
    expect(api).toHaveBeenCalledWith(
      `/characters/${OWNER}/abilities/${ENTRY}`,
      { method: 'PATCH', body: { prepared: true } },
    );
  });

  it('у эффекта менять нечего', async () => {
    const api = vi.fn();
    const result = await run(api, 'link_update', {
      owner: 'monster',
      ownerId: OWNER,
      target: 'effect',
      entryId: ENTRY,
    });
    expect(result.isError).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('link_remove', () => {
  it('убирает строку связи', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'link_remove', {
      owner: 'monster',
      ownerId: OWNER,
      target: 'item',
      entryId: ENTRY,
    });
    expect(api).toHaveBeenCalledWith(`/monsters/${OWNER}/items/${ENTRY}`, {
      method: 'DELETE',
    });
  });
});
