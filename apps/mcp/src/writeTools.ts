import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiCall } from './apiClient.js';
import {
  entityPath,
  ENTITY_KINDS,
  isCatalogKind,
  type EntityKind,
} from './entityKinds.js';
import { buildFormatGuide } from './formatGuide/index.js';
import { mergePatch, recordToInput } from './recordInput.js';
import { json, text, type Guarded } from './toolResult.js';

const kind = z.enum(ENTITY_KINDS);
const data = z.record(z.string(), z.unknown());

// Что create подставляет сам: вид персонажа по kind инструмента; запись каталога —
// скрытой, без описания и источников, если модель их не задала. Публиковать токену
// нельзя (docs/plan/ai-access.md), на isPublic: true сервер ответит 403 сам.
function createBody(k: EntityKind, body: Record<string, unknown>) {
  if (k === 'character' || k === 'npc') {
    return { ...body, kind: k === 'npc' ? 'npc' : 'pc' };
  }
  return isCatalogKind(k)
    ? { isPublic: false, description: '', sources: [], ...body }
    : body;
}

// Создание и правка записей (docs/plan/ai-access.md, этап 3). Тело проверяет сервер своими
// DTO и отвечает по-русски, что не так, — модель видит это как ошибку инструмента.
export function registerWriteTools(
  server: McpServer,
  api: ApiCall,
  guarded: Guarded,
) {
  server.registerTool(
    'format_guide',
    {
      description:
        'Справка по полям записи вида kind для create и update: что обязательно, допустимые значения, заготовки. Прочитай перед первым create этого вида.',
      inputSchema: { kind },
    },
    ({ kind: k }) => Promise.resolve(text(buildFormatGuide(k))),
  );

  server.registerTool(
    'create',
    {
      description:
        'Создать запись. data — поля записи по format_guide(kind). Всё создаётся скрытым: запись каталога — isPublic false, персонаж — доступ «только я»; публикует пользователь сам. Ответ — созданная запись с id. Связи (предметы, способности, эффекты) добавляет link_add, картинки — отдельно.',
      inputSchema: { kind, data },
    },
    ({ kind: k, data: body }) =>
      guarded(async () =>
        json(
          await api<unknown>(entityPath(k), {
            method: 'POST',
            body: createBody(k, body),
          }),
        ),
      ),
  );

  server.registerTool(
    'update',
    {
      description:
        'Поправить запись: data — только то, что меняется. Вложенные объекты сливаются (можно прислать {statBlock: {armorClass: 13}}), а массивы и details заменяются целиком — пришли их полностью. Связи меняет не update, а link_add / link_update / link_remove. Опубликовать или скрыть запись нельзя: isPublic остаётся как есть. Ответ — запись после правки.',
      inputSchema: { kind, id: z.uuid(), data },
    },
    ({ kind: k, id, data: patch }) =>
      guarded(async () => {
        const path = entityPath(k, id);
        const record = await api<Record<string, unknown>>(path);
        const body = mergePatch(recordToInput(k, record), patch);
        return json(await api<unknown>(path, { method: 'PUT', body }));
      }),
  );
}
