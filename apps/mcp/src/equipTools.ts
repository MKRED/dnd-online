import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ATTUNEMENT_MAX, EQUIP_SLOTS } from 'shared';
import { z } from 'zod';
import type { ApiCall } from './apiClient.js';
import { summarizeLinks } from './linkSummary.js';
import { json, type Guarded } from './toolResult.js';

// Кукла персонажа или НПС (docs/plan/equipment.md, этап 2; правила —
// docs/dnd/weapons-armor.md, «Кукла»). Ответ — инвентарь коротко, как у связей: у строки
// equipped (места) и attuned.
const owner = {
  characterId: z.uuid().describe('id персонажа или НПС'),
};

export function registerEquipTools(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  const base = (characterId: string) => `/characters/${characterId}`;

  server.registerTool(
    'equip_item',
    {
      description: `Надеть строку инвентаря на место куклы. entryId — inventory[].id из get, вещь «при себе» (carried). Места: ${EQUIP_SLOTS.join(', ')}. Ближнее оружие — meleeMain/meleeOff, дальнобойное — rangedMain/rangedOff; двуручное — только в основную руку и снимает вторую руку своего набора, пока оно там, вторая рука закрыта; щит — meleeOff; доспех и одежда на тело — body; кольцо — ring1 или ring2. Место занято — прежняя вещь снимается; единственная вещь переезжает со старого места. Карточка предмета в get: item.equip.slots — куда он подходит.`,
      inputSchema: {
        ...owner,
        slot: z.enum(EQUIP_SLOTS),
        entryId: z.uuid(),
      },
    },
    ({ characterId, slot, entryId }) =>
      guarded(async () =>
        json(
          summarizeLinks(
            await api<unknown>(`${base(characterId)}/equipment/${slot}`, {
              method: 'PUT',
              body: { entryId },
            }),
          ),
        ),
      ),
  );

  server.registerTool(
    'unequip_item',
    {
      description:
        'Снять вещь с места куклы. Вещь остаётся в инвентаре, настройка на неё — тоже.',
      inputSchema: { ...owner, slot: z.enum(EQUIP_SLOTS) },
    },
    ({ characterId, slot }) =>
      guarded(async () =>
        json(
          summarizeLinks(
            await api<unknown>(`${base(characterId)}/equipment/${slot}`, {
              method: 'DELETE',
            }),
          ),
        ),
      ),
  );

  server.registerTool(
    'set_attunement',
    {
      description: `Настроить персонажа на магический предмет строки инвентаря или снять настройку. Только у предмета «требует настройки» (item.equip.attunement), при себе, не больше ${ATTUNEMENT_MAX} и не на две копии одного предмета. Настройка — у вещи, а не у места: снятая вещь её не теряет.`,
      inputSchema: { ...owner, entryId: z.uuid(), attuned: z.boolean() },
    },
    ({ characterId, entryId, attuned }) =>
      guarded(async () =>
        json(
          summarizeLinks(
            await api<unknown>(
              `${base(characterId)}/items/${entryId}/attunement`,
              { method: attuned ? 'PUT' : 'DELETE' },
            ),
          ),
        ),
      ),
  );
}
