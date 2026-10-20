import {
  CONTAINER_LOOKS,
  CREATURE_SIZES,
  FACINGS,
  RESIZE_CUTS,
  RESIZE_SIDES,
  type CreatureSize,
} from 'shared';
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
const grow = z
  .object(
    Object.fromEntries(
      RESIZE_SIDES.map((side) => [side, z.number().int().optional()]),
    ),
  )
  .describe('Сколько клеток добавить с каждой стороны (меньше нуля — убрать)');

// Объекты на карте (docs/plan/map-objects.md): поля по виду; id — из find_catalog.
const facingValue = z
  .literal(FACINGS)
  .describe('Взгляд: 0, 45, …, 315 — градусы по часовой от севера');
const facing = facingValue.optional();
const catalogId = (what: string) =>
  z.string().uuid().describe(`id ${what} из find_catalog`);
const size = z
  .enum(Object.keys(CREATURE_SIZES) as [CreatureSize, ...CreatureSize[]])
  .optional();
const quantity = z.number().int().min(1).optional();
const objectItem = z.object({ itemId: catalogId('предмета'), quantity });
const objectBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('start'), facing }),
  z.object({
    kind: z.literal('monster'),
    monsterId: catalogId('монстра'),
    facing,
  }),
  z.object({
    kind: z.literal('npc'),
    characterId: catalogId('НПС'),
    size,
    facing,
  }),
  z.object({
    kind: z.literal('container'),
    name: z.string().optional(),
    look: z.enum(CONTAINER_LOOKS).optional(),
    items: z.array(objectItem).optional(),
  }),
  z.object({
    kind: z.literal('item'),
    itemId: catalogId('предмета'),
    quantity,
  }),
]);
const objectId = z.number().int().min(1).describe('Номер объекта на карте');

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
  z.object({
    op: z.literal('resize'),
    grow,
    cut: z.enum(RESIZE_CUTS).optional(),
  }),
  z.object({ op: z.literal('placeObject'), at: cell, object: objectBody }),
  z.object({ op: z.literal('moveObject'), id: objectId, at: cell }),
  z.object({
    op: z.literal('turnObject'),
    id: objectId,
    facing: facingValue,
  }),
  z.object({
    op: z.literal('updateObject'),
    id: objectId,
    object: z
      .object({
        facing,
        monsterId: catalogId('монстра').optional(),
        characterId: catalogId('НПС').optional(),
        size,
        name: z.string().optional(),
        look: z.enum(CONTAINER_LOOKS).optional(),
        items: z.array(objectItem).optional(),
        itemId: catalogId('предмета').optional(),
        quantity,
      })
      .describe('Только меняемые поля; вид объекта не меняется'),
  }),
  z.object({ op: z.literal('removeObject'), id: objectId }),
]);

export const mapId = z.string().uuid().describe('id карты из list_maps');
