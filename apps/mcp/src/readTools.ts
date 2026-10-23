import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiCall } from './apiClient.js';
import { entityPath, ENTITY_KINDS } from './entityKinds.js';
import { searchEntities, SEARCH_LIMIT } from './search.js';
import { json, type Guarded } from './toolResult.js';

const kind = z
  .enum(ENTITY_KINDS)
  .describe(
    'character — персонаж игрока, npc — НПС, monster — монстр, item — предмет, ability — способность (в том числе заклинание), effect — эффект, block_group — группа своих блоков для карт, voxel_model — модель из вокселей, furniture — обстановка (своя модель с креплением, ставится на карту)',
  );

// Поиск и чтение всего, что есть у пользователя (docs/plan/ai-access.md, этап 2).
export function registerReadTools(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  server.registerTool(
    'search',
    {
      description: `Найти записи пользователя: свои персонажи и НПС, свои и опубликованные чужие монстры, предметы, способности, эффекты, группы блоков, модели и обстановка. Начинай с него, чтобы понять, что уже есть и чего не хватает. kind — один вид (без него — все), q — часть названия без учёта регистра. В строке: id, вид, название, category (категория предмета, тип монстра, категория способности), own — своё или чужое (у чужого — author), visibility (hidden — скрыто, public — опубликовано, link — персонаж открыт по ссылке), hasImage. Не больше ${SEARCH_LIMIT} строк; total — сколько нашлось всего, byKind — сколько каждого вида; если нашлось больше — уточни kind или q. Целиком запись отдаёт get.`,
      inputSchema: {
        kind: kind.optional(),
        q: z.string().max(100).optional(),
      },
    },
    ({ kind: k, q }) =>
      guarded(async () => json(await searchEntities(api, k, q))),
  );

  server.registerTool(
    'get',
    {
      description:
        'Запись целиком по id из search. У персонажа и НПС — лист со способностями, инвентарём и эффектами; у монстра — стат-блок, способности, снаряжение и эффекты; у предмета — details категории (у своего ещё наборы и персонажи, у которых он лежит); у способности — активация, затраты и шаги «Применения»; у эффекта — составляющие и длительность; у модели — размер, палитра, сжатые воксели и свойства клеток; у обстановки — крепление и модель целиком. Чужое скрытое отвечает 404.',
      inputSchema: { kind, id: z.uuid() },
    },
    ({ kind: k, id }) =>
      guarded(async () => json(await api<unknown>(entityPath(k, id)))),
  );
}
