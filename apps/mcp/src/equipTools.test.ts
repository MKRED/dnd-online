import { describe, expect, it, vi } from 'vitest';
import type { ApiCall } from './apiClient.js';
import { summarizeLinks } from './linkSummary.js';
import { call, connect } from './testing/mcpClient.js';

const CHARACTER = '11111111-1111-4111-8111-111111111111';
const ENTRY = '33333333-3333-4333-8333-333333333333';

async function run(
  api: ReturnType<typeof vi.fn>,
  name: string,
  args: Record<string, unknown>,
) {
  const client = await connect(api as unknown as ApiCall);
  return call(client, name, args);
}

describe('кукла', () => {
  it('equip_item надевает строку на место', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'equip_item', {
      characterId: CHARACTER,
      slot: 'meleeMain',
      entryId: ENTRY,
    });
    expect(api).toHaveBeenCalledWith(
      `/characters/${CHARACTER}/equipment/meleeMain`,
      { method: 'PUT', body: { entryId: ENTRY } },
    );
  });

  it('unequip_item и set_attunement — свои адреса', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'unequip_item', { characterId: CHARACTER, slot: 'ring2' });
    expect(api).toHaveBeenLastCalledWith(
      `/characters/${CHARACTER}/equipment/ring2`,
      { method: 'DELETE' },
    );
    await run(api, 'set_attunement', {
      characterId: CHARACTER,
      entryId: ENTRY,
      attuned: false,
    });
    expect(api).toHaveBeenLastCalledWith(
      `/characters/${CHARACTER}/items/${ENTRY}/attunement`,
      { method: 'DELETE' },
    );
  });

  it('неизвестное место отклоняется до запроса', async () => {
    const api = vi.fn().mockResolvedValue([]);
    await run(api, 'equip_item', {
      characterId: CHARACTER,
      slot: 'tail',
      entryId: ENTRY,
    });
    expect(api).not.toHaveBeenCalled();
  });

  it('короткий ответ сохраняет места и настройку строки', () => {
    expect(
      summarizeLinks([
        {
          id: ENTRY,
          equipped: ['ring1'],
          attuned: true,
          item: { id: 'i', name: 'Кольцо', equip: { slots: ['ring1'] } },
        },
      ]),
    ).toEqual([
      {
        id: ENTRY,
        equipped: ['ring1'],
        attuned: true,
        item: { id: 'i', name: 'Кольцо' },
      },
    ]);
  });
});
