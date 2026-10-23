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
import { loadGameBlockCatalog } from '../../block-groups/block-catalog.js';
import type { DbTransaction } from '../../database/database.service.js';
import type { SceneRow } from '../scenes/scene-copy.js';
import { sceneRefs } from '../scenes/scene-refs.js';
import { sceneStorage } from '../scenes/scene-storage.js';

// Существо карты (монстр, НПС) как препятствие для фигурок. hidden — его не видят игроки:
// их ход его не учитывает, иначе отказ сервера выдал бы засаду. objectId — чтобы ход
// самого существа не упирался в него же.
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
