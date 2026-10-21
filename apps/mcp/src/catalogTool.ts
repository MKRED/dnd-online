import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MapCatalogEntry } from 'shared';
import { z } from 'zod';
import type { ApiCall } from './apiClient.js';
import type { Guarded } from './toolResult.js';

// Поиск того, что можно поставить на карту: id для операций объектов
// (docs/plan/done/map-objects.md, «Нейросеть»). Сервер ищет только своё и опубликованное.
export function registerCatalogTool(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  server.registerTool(
    'find_catalog',
    {
      description:
        'Найти в каталоге то, что можно поставить на карту: kind "monster" — монстры (свои и опубликованные; с размером и ролью, unique — каждый такой не больше одного раза на карте), "item" — предметы с весом в фунтах (для контейнеров и предметов на полу), "npc" — свои НПС. q — часть названия; без него — первые записи по алфавиту. Не больше 20 результатов. id отсюда идут в placeObject.',
      inputSchema: {
        kind: z.enum(['monster', 'item', 'npc']),
        q: z.string().max(100).optional(),
      },
    },
    ({ kind, q }) =>
      guarded(async () => {
        const params = new URLSearchParams({ kind });
        if (q) params.set('q', q);
        const found = await api<MapCatalogEntry[]>(`/map-catalog?${params}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(found, null, 2) }],
        };
      }),
  );
}
