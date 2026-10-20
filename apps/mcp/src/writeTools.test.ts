import { describe, expect, it, vi } from 'vitest';
import { DndApiError, type ApiCall } from './apiClient.js';
import { ENTITY_KINDS } from './entityKinds.js';
import { call, connect } from './testing/mcpClient.js';

const ID = '11111111-1111-4111-8111-111111111111';
const EFFECT_ID = '22222222-2222-4222-8222-222222222222';

async function run(
  api: ReturnType<typeof vi.fn>,
  name: string,
  args: Record<string, unknown>,
) {
  const client = await connect(api as unknown as ApiCall);
  return call(client, name, args);
}

describe('create', () => {
  it('создаёт запись каталога скрытой и с пустыми описанием и источниками', async () => {
    const api = vi.fn().mockResolvedValue({ id: ID });
    await run(api, 'create', {
      kind: 'monster',
      data: { name: 'Крыса', category: 'beast' },
    });
    expect(api).toHaveBeenCalledWith('/monsters', {
      method: 'POST',
      body: {
        isPublic: false,
        description: '',
        sources: [],
        name: 'Крыса',
        category: 'beast',
      },
    });
  });

  it('вид персонажа задаёт kind инструмента, а не data', async () => {
    const api = vi.fn().mockResolvedValue({ id: ID });
    await run(api, 'create', {
      kind: 'npc',
      data: { name: 'Трактирщик', kind: 'pc' },
    });
    expect(api).toHaveBeenCalledWith('/characters', {
      method: 'POST',
      body: { name: 'Трактирщик', kind: 'npc' },
    });
  });

  it('ошибку проверки сервера отдаёт модели', async () => {
    const api = vi
      .fn()
      .mockRejectedValue(new DndApiError('HTTP 400: Неизвестный тип существа'));
    const result = await run(api, 'create', { kind: 'monster', data: {} });
    expect(result).toEqual({
      isError: true,
      text: 'HTTP 400: Неизвестный тип существа',
    });
  });
});

describe('update', () => {
  it('сливает правку с записью вглубь и отправляет целиком', async () => {
    const record = {
      id: ID,
      name: 'Крыса',
      isPublic: true,
      statBlock: { armorClass: 10, speed: { walk: 30, climb: null } },
      sources: ['Monster Manual 2024'],
    };
    const api = vi.fn().mockResolvedValueOnce(record).mockResolvedValueOnce({});

    await run(api, 'update', {
      kind: 'monster',
      id: ID,
      data: { statBlock: { speed: { climb: 30 } }, sources: [] },
    });

    expect(api).toHaveBeenNthCalledWith(1, `/monsters/${ID}`);
    expect(api).toHaveBeenNthCalledWith(2, `/monsters/${ID}`, {
      method: 'PUT',
      body: {
        ...record,
        statBlock: { armorClass: 10, speed: { walk: 30, climb: 30 } },
        sources: [],
      },
    });
  });

  it('details заменяет целиком: при смене категории старые поля не остаются', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ category: 'food', details: { satiety: 3 } })
      .mockResolvedValueOnce({});
    await run(api, 'update', {
      kind: 'item',
      id: ID,
      data: { category: 'treasure', details: { kind: 'gem' } },
    });
    expect(api).toHaveBeenLastCalledWith(`/items/${ID}`, {
      method: 'PUT',
      body: { category: 'treasure', details: { kind: 'gem' } },
    });
  });

  it('у набора оставляет в составе только itemId и quantity', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({
        category: 'pack',
        details: {
          contents: [
            { itemId: EFFECT_ID, quantity: 2, item: { name: 'Факел' } },
          ],
        },
      })
      .mockResolvedValueOnce({});
    await run(api, 'update', { kind: 'item', id: ID, data: { weight: 5 } });
    expect(api).toHaveBeenLastCalledWith(`/items/${ID}`, {
      method: 'PUT',
      body: {
        category: 'pack',
        details: { contents: [{ itemId: EFFECT_ID, quantity: 2 }] },
        weight: 5,
      },
    });
  });

  it('у способности оставляет в эффектах шагов только effectId', async () => {
    const step = (effect: unknown) => ({
      when: 'always',
      hit: { damage: [], addModifier: false, effects: [effect] },
      miss: { damage: 'none', effects: [effect] },
    });
    const api = vi
      .fn()
      .mockResolvedValueOnce({
        steps: [step({ effectId: EFFECT_ID, effect: { name: 'Яд' } })],
      })
      .mockResolvedValueOnce({});
    await run(api, 'update', { kind: 'ability', id: ID, data: {} });
    expect(api).toHaveBeenLastCalledWith(`/abilities/${ID}`, {
      method: 'PUT',
      body: { steps: [step({ effectId: EFFECT_ID })] },
    });
  });
});

describe('format_guide', () => {
  it.each(ENTITY_KINDS)('%s: правила и поля вида', async (kind) => {
    const result = await run(vi.fn(), 'format_guide', { kind });
    expect(result.text).toContain('редакции 2024');
    expect(result.text).toContain('- name — ');
  });

  it('берёт значения из shared', async () => {
    const monster = await run(vi.fn(), 'format_guide', { kind: 'monster' });
    expect(monster.text).toContain('beast (Зверь)');
    expect(monster.text).toContain('"hitPoints":{"average":4');
    const effect = await run(vi.fn(), 'format_guide', { kind: 'effect' });
    expect(effect.text).toContain('poisoned (Отравленный)');
  });
});
