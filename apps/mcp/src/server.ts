import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  MapEditResult,
  MapInfo,
  MapSliceResponse,
  MapSummaryResponse,
} from 'shared';
import { z } from 'zod';
import { MapApiError, type ApiCall } from './apiClient.js';
import { buildBlockGuide } from './blockGuide.js';
import { buildViewUrl, VIEWS } from './viewUrl.js';

const cell = z
  .tuple([z.number().int(), z.number().int(), z.number().int()])
  .describe('[x, y, z]');
const point = z.tuple([z.number(), z.number(), z.number()]);
const rotation = z
  .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
  .optional();
const block = z.string().describe('Имя блока, например stone или wood_stairs');

// Схема операций — для подсказки модели; окончательно их проверяет сервер
// (parseMapOpBatch из shared) по тем же правилам.
const mapOp = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setBlock'), at: cell, block, rotation }),
  z.object({ op: z.literal('fillBox'), from: cell, to: cell, block, rotation }),
  z.object({
    op: z.literal('hollowBox'),
    from: cell,
    to: cell,
    block,
    rotation,
  }),
  z.object({
    op: z.literal('replace'),
    from: cell,
    to: cell,
    match: z.string(),
    block,
    rotation,
  }),
]);

const mapId = z.string().uuid().describe('id карты из list_maps');

const text = (value: string): CallToolResult => ({
  content: [{ type: 'text', text: value }],
});
const json = (value: unknown) => text(JSON.stringify(value, null, 2));

// Ошибки API возвращаются модели как результат с isError, а не исключением:
// так она видит сообщение сервера («Операция №2: Неизвестный блок…») и может исправиться.
async function guarded(
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof MapApiError)
      return { ...text(err.message), isError: true };
    console.error('MCP tool failed', err);
    throw err;
  }
}

export function createMapMcpServer(api: ApiCall, webUrl: string): McpServer {
  const server = new McpServer({ name: 'dnd-map', version: '0.1.0' });

  server.registerTool(
    'list_maps',
    {
      description:
        'Список карт пользователя (id, название, номер последней правки seq).',
    },
    () => guarded(async () => json(await api<MapInfo[]>('/maps'))),
  );

  server.registerTool(
    'create_map',
    {
      description: 'Создать пустую карту.',
      inputSchema: { name: z.string().min(1).max(100) },
    },
    ({ name }) =>
      guarded(async () =>
        json(await api<MapInfo>('/maps', { method: 'POST', body: { name } })),
      ),
  );

  server.registerTool(
    'block_guide',
    {
      description:
        'Справка: координаты и стороны света, имена блоков, материалы, фигуры, поворот, форматы операций. Прочитай перед первой правкой.',
    },
    () => Promise.resolve(text(buildBlockGuide())),
  );

  server.registerTool(
    'map_summary',
    {
      description: 'Сводка карты: границы, число блоков по типам, палитра.',
      inputSchema: { mapId },
    },
    ({ mapId: id }) =>
      guarded(async () =>
        json(await api<MapSummaryResponse>(`/maps/${id}/summary`)),
      ),
  );

  server.registerTool(
    'map_slice',
    {
      description:
        'ASCII-срез карты на уровне высоты y: строки — z (север сверху), столбцы — x, с легендой. Прямоугольник задаётся целиком или не задаётся (тогда — границы карты). Не больше 100 000 клеток.',
      inputSchema: {
        mapId,
        y: z.number().int(),
        minX: z.number().int().optional(),
        maxX: z.number().int().optional(),
        minZ: z.number().int().optional(),
        maxZ: z.number().int().optional(),
      },
    },
    ({ mapId: id, ...query }) =>
      guarded(async () => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined) params.set(key, String(value));
        }
        const slice = await api<MapSliceResponse>(
          `/maps/${id}/slice?${params.toString()}`,
        );
        return text(`seq ${slice.seq}\n${slice.text}`);
      }),
  );

  server.registerTool(
    'apply_ops',
    {
      description:
        'Применить пачку операций к карте (до 100 операций). Пачка применяется целиком или не применяется вовсе и откатывается одним undo. Форматы — в block_guide.',
      inputSchema: { mapId, ops: z.array(mapOp).min(1).max(100) },
    },
    ({ mapId: id, ops }) =>
      guarded(async () =>
        json(
          await api<MapEditResult>(`/maps/${id}/ops`, {
            method: 'POST',
            body: { ops },
          }),
        ),
      ),
  );

  server.registerTool(
    'undo',
    {
      description: 'Отменить последнюю пачку операций на карте.',
      inputSchema: { mapId },
    },
    ({ mapId: id }) =>
      guarded(async () =>
        json(await api<MapEditResult>(`/maps/${id}/undo`, { method: 'POST' })),
      ),
  );

  server.registerTool(
    'redo',
    {
      description:
        'Вернуть отменённую пачку (пока после отмены не было новых операций).',
      inputSchema: { mapId },
    },
    ({ mapId: id }) =>
      guarded(async () =>
        json(await api<MapEditResult>(`/maps/${id}/redo`, { method: 'POST' })),
      ),
  );

  server.registerTool(
    'view_url',
    {
      description:
        'Ссылка на 3D-вид карты с заданным ракурсом и срезом по высоте. Открой её браузером (MCP браузера), дождись текста «Сцена готова» и сделай снимок, чтобы проверить результат. Страница открывается под сессией браузера, а не по токену: браузер должен быть залогинен тем же пользователем, что и владелец токена. Если видно «Карта не найдена» или страница входа — попроси пользователя войти в окне браузера. view — с какой стороны смотрит камера; cam/target — точная камера в координатах клеток (важнее view); y — скрыть всё выше этого уровня.',
      inputSchema: {
        mapId,
        view: z.enum(VIEWS).optional(),
        y: z.number().int().optional(),
        cam: point.optional(),
        target: point.optional(),
      },
    },
    ({ mapId: id, ...options }) =>
      Promise.resolve(text(buildViewUrl(webUrl, id, options))),
  );

  return server;
}
