import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  SECTION_AXES,
  type MapEditResult,
  type MapInfo,
  type MapSectionResponse,
  type MapSliceResponse,
  type MapSummaryResponse,
} from 'shared';
import { z } from 'zod';
import { MapApiError, type ApiCall } from './apiClient.js';
import { buildBlockGuide } from './blockGuide.js';
import { mapId, mapOp, point } from './schemas.js';
import { buildViewUrl, VIEWS } from './viewUrl.js';

const text = (value: string): CallToolResult => ({
  content: [{ type: 'text', text: value }],
});
const json = (value: unknown) => text(JSON.stringify(value, null, 2));
// Итог правки без списка изменённых клеток: он нужен вебу для обновления сцены,
// а нейросети раздул бы контекст (заливка — десятки тысяч чисел).
const editSummary = ({ changes: _changes, ...summary }: MapEditResult) =>
  json(summary);

// Параметры среза в строку запроса; незаданные не передаём — сервер возьмёт границы карты.
function queryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

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
        const slice = await api<MapSliceResponse>(
          `/maps/${id}/slice?${queryString(query)}`,
        );
        return text(`seq ${slice.seq}\n${slice.text}`);
      }),
  );

  server.registerTool(
    'map_section',
    {
      description:
        'ASCII-разрез карты вертикальной плоскостью x = at или z = at: строки — высота y (верх сверху), столбцы — вторая горизонтальная ось, с легендой. Нужен там, где горизонтальный срез не помогает: крыши, высота этажей, лестницы и проёмы над ними. axis "z" — вид с юга (столбцы — x, слева запад), axis "x" — вид с запада (столбцы — z, слева север). min/max (вдоль столбцов) и minY/maxY задаются парами или не задаются (тогда — границы карты). Не больше 100 000 клеток.',
      inputSchema: {
        mapId,
        axis: z.enum(SECTION_AXES),
        at: z.number().int(),
        min: z.number().int().optional(),
        max: z.number().int().optional(),
        minY: z.number().int().optional(),
        maxY: z.number().int().optional(),
      },
    },
    ({ mapId: id, ...query }) =>
      guarded(async () => {
        const section = await api<MapSectionResponse>(
          `/maps/${id}/section?${queryString(query)}`,
        );
        return text(`seq ${section.seq}\n${section.text}`);
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
        editSummary(
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
        editSummary(
          await api<MapEditResult>(`/maps/${id}/undo`, { method: 'POST' }),
        ),
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
        editSummary(
          await api<MapEditResult>(`/maps/${id}/redo`, { method: 'POST' }),
        ),
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
