import type { CharacterModelFit, MonsterRefModel } from 'shared';
import type { CreatureModelInput } from './objectLayout';

// 3D-модель монстра на карте и сцене (docs/plan/done/monster-models.md, этап 5): файл модели
// рисуется как модель персонажа, рисованная — вокселями; поправка размера — из ссылки
// монстра. path — где взять байты файла: на карте маршрутом монстра, на сцене — копию.
export function monsterModelLook(
  model: MonsterRefModel,
  path: (modelId: string, version: number) => string,
): CreatureModelInput {
  const { mesh } = model;
  if (!mesh)
    return {
      kind: 'voxels',
      fields: model,
      fit: { scale: model.scale, turn: 0, up: 'y' },
    };
  return {
    kind: 'file',
    path: path(model.id, mesh.version),
    format: mesh.format,
    color: mesh.color,
    fit: meshFigureFit(model.scale, mesh.fit),
  };
}

// Поворот файла в «Моделях» — по часовой (MeshModel), у модели персонажа — против
// (placeModel): четверть оборота считается с другой стороны. Лицом оба — к северу.
function meshFigureFit(
  scale: number,
  fit: NonNullable<MonsterRefModel['mesh']>['fit'],
): CharacterModelFit {
  return {
    scale,
    turn: ((4 - fit.turn) % 4) as CharacterModelFit['turn'],
    up: fit.up,
  };
}
