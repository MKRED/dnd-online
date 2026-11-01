import {
  buildFurnitureLayer,
  objectRefIds,
  objectSize,
  type BlockCatalog,
  type MapObject,
  type MapState,
  type ObjectRefs,
  type Occupant,
} from 'shared';
import { and, eq } from 'drizzle-orm';
import { loadGameBlockCatalog } from '../../block-groups/block-catalog.js';
import type { DbTransaction } from '../../database/database.service.js';
import { gameCreatures } from '../../database/schema/index.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { sceneRefs } from '../scenes/scene-refs.js';
import { sceneStorage } from '../scenes/scene-storage.js';

// Существо карты (монстр, НПС) как препятствие для фигурок. hidden — его не видят игроки:
// их ход его не учитывает, иначе отказ сервера выдал бы засаду. objectId — чтобы ход
// самого существа не упирался в него же. incapacitated — у него 0 хитов: сквозь него
// проходят (docs/dnd/movement.md).
export type SceneCreature = Occupant & { hidden: boolean; objectId: number };

// Сцена глазами правил хода: блоки, существа на ней и стартовые точки по номеру.
export interface SceneWorld {
  // С каталогом мастера: свои блоки сцены правила читают так же, как базовые, и с
  // клетками обстановки (docs/plan/blocks.md, этап 8в2) — путь, обзор и туман их видят.
  map: MapState & { blocks: BlockCatalog };
  // Справочник объектов сцены: место обстановки под туманом (fog-delta.ts).
  refs: ObjectRefs;
  // Все объекты сцены по номеру — туману войны (что игрок увидел или потерял из виду).
  objects: MapObject[];
  creatures: SceneCreature[];
  starts: Extract<MapObject, { kind: 'start' }>[];
}

export async function loadSceneWorld(
  tx: DbTransaction,
  scene: SceneRow,
): Promise<SceneWorld> {
  const storage = sceneStorage(scene.id);
  const store = await storage.loadChunks(tx, 'all');
  const objects = [
    ...(await storage.loadObjects(tx, scene.nextObjectId)).byId.values(),
  ].sort((a, b) => a.id - b.id);
  const { refs } = await sceneRefs(tx, scene.gameId, objectRefIds(objects));
  const down = await downCreatureIds(tx, scene.id);
  return {
    map: {
      store,
      palette: scene.palette,
      blocks: await loadGameBlockCatalog(tx, scene.gameId),
      furniture: buildFurnitureLayer(objects, refs),
    },
    refs,
    objects,
    creatures: objects.flatMap((object) =>
      object.kind === 'monster' || object.kind === 'npc'
        ? [
            {
              at: object.at,
              size: objectSize(object, refs),
              ally: false,
              incapacitated: down.has(object.id),
              hidden: object.hidden,
              objectId: object.id,
            },
          ]
        : [],
    ),
    starts: objects.flatMap((object) =>
      object.kind === 'start' ? [object] : [],
    ),
  };
}

// Поверженные монстры и НПС сцены: строки состояния нет — хиты полные, а максимум у
// экземпляра не ниже 1, так что 0 в строке и есть «повержен».
async function downCreatureIds(
  tx: DbTransaction,
  sceneId: string,
): Promise<Set<number>> {
  const rows = await tx
    .select({ objectId: gameCreatures.objectId })
    .from(gameCreatures)
    .where(
      and(
        eq(gameCreatures.sceneId, sceneId),
        eq(gameCreatures.hitPointsCurrent, 0),
      ),
    );
  return new Set(rows.map((row) => row.objectId));
}
