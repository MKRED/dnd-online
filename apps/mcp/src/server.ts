import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SECTION_AXES,
  type MapEditResult,
  type MapInfo,
  type MapListItem,
  type MapSectionResponse,
  type MapSliceResponse,
  type MapSummaryResponse,
} from 'shared';
import { z } from 'zod';
import type { ApiCall } from './apiClient.js';
import { buildBlockGuide } from './blockGuide.js';
import { registerCatalogTool } from './catalogTool.js';
import { registerImageTools } from './imageTools.js';
import { registerLinkTools } from './linkTools.js';
import { registerReadTools } from './readTools.js';
import { mapId, mapOp, point } from './schemas.js';
import { guarded, json, text } from './toolResult.js';
import { buildViewUrl, VIEWS } from './viewUrl.js';
import { registerWriteTools } from './writeTools.js';

// Итог правки без списка изменённых клеток и справочника ссылок: они нужны вебу для
// обновления сцены, а нейросети раздули бы контекст (заливка — десятки тысяч чисел).
// Номера новых объектов остаются: по ним модель правит объекты дальше.
const editSummary = ({
  changes: _changes,
  refs: _refs,
  ...summary
}: MapEditResult) => json(summary);

// Параметры среза в строку запроса; незаданные не передаём — сервер возьмёт границы карты.
function queryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

// Сервер dnd: всё приложение от аккаунта владельца токена (docs/plan/ai-access.md) —
// поиск, чтение, создание и правка записей, их связи, картинки и инструменты карты.
export function createDndMcpServer(api: ApiCall, webUrl: string): McpServer {
  const server = new McpServer({ name: 'dnd', version: '0.2.0' });

  registerReadTools(server, api, guarded);
  registerWriteTools(server, api, guarded);
  registerLinkTools(server, api, guarded);
  registerImageTools(server, api, guarded);

  server.registerTool(
    'list_maps',
    {
      description:
        'Список карт пользователя (id, название, размер, номер последней правки seq, число стартов startCount).',
    },
    () => guarded(async () => json(await api<MapListItem[]>('/maps'))),
  );

  server.registerTool(
    'create_map',
    {
      description:
        'Создать пустую карту. Размер — width (x) × depth (z) клеток, по умолчанию 32 × 32; потом его меняет операция resize.',
      inputSchema: {
        name: z.string().min(1).max(100),
        width: z.number().int().min(1).optional(),
        depth: z.number().int().min(1).optional(),
      },
    },
    (body) =>
      guarded(async () =>
        json(await api<MapInfo>('/maps', { method: 'POST', body })),
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
      description:
        'Сводка карты: размер (size — width × depth, клетки x от 0 до width − 1, z от 0 до depth − 1), предел высоты maxHeight, габарит построенного (bounds), число блоков по типам, палитра и объекты (objects: номер, вид, клетка, подпись, взгляд, размер и предупреждения — например, «здесь нельзя стоять»).',
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
        'ASCII-срез карты на уровне высоты y: строки — z (север сверху), столбцы — x, с легендой. Объекты, стоящие на этом уровне, перечислены под сеткой. Прямоугольник задаётся целиком или не задаётся (тогда — вся карта). Не больше 100 000 клеток.',
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
        'ASCII-разрез карты вертикальной плоскостью x = at или z = at: строки — высота y (верх сверху), столбцы — вторая горизонтальная ось, с легендой. Нужен там, где горизонтальный срез не помогает: крыши, высота этажей, лестницы и проёмы над ними. axis "z" — вид с юга (столбцы — x, слева запад), axis "x" — вид с запада (столбцы — z, слева север). min/max (вдоль столбцов) и minY/maxY задаются парами или не задаются (тогда — вся ширина или глубина карты и высота от земли до верхнего блока). Не больше 100 000 клеток.',
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
        'Применить пачку операций к карте (до 100 операций): блоки, размер и объекты (старт, монстр, НПС, контейнер, предмет). Пачка применяется целиком или не применяется вовсе и откатывается одним undo. Номера поставленных объектов — в createdObjectIds. Форматы — в block_guide.',
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

  registerCatalogTool(server, api, guarded);

  return server;
}
