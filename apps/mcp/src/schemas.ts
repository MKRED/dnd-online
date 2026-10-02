import { z } from 'zod';

// Схемы аргументов инструментов MCP.

const cell = z
  .tuple([z.number().int(), z.number().int(), z.number().int()])
  .describe('[x, y, z]');
export const point = z.tuple([z.number(), z.number(), z.number()]);
const rotation = z
  .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
  .optional();
const block = z.string().describe('Имя блока, например stone или wood_stairs');

// Схема операций — для подсказки модели; окончательно их проверяет сервер
// (parseMapOpBatch из shared) по тем же правилам.
export const mapOp = z.discriminatedUnion('op', [
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

export const mapId = z.string().uuid().describe('id карты из list_maps');
