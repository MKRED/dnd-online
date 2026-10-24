import type { Facing } from 'shared';
import {
  CATALOG_OBJECT_IMAGES,
  type ObjectImagePaths,
} from '../../MapScene/objects/objectImages';
import type { SceneObjectLook } from '../../MapScene/objects/objectLayout';
import {
  rightFacing,
  turnedExtent,
  type ObjectChoice,
} from './objectPlacement';

const letterOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

// Как выглядит то, что ставит «Поставить», — для полупрозрачного объекта под курсором
// (вариант В артборда «Н1», 2026-10-24, docs/plan/scene-page.md). Берётся из самого
// выбора: картинки и модель хранятся в нём для плиток «Что поставить», так что ставящееся
// видно ещё до того, как оно попало в справочник карты.
export function choiceLook(
  choice: ObjectChoice,
  facing: Facing,
  images: ObjectImagePaths = CATALOG_OBJECT_IMAGES,
): SceneObjectLook {
  switch (choice.kind) {
    case 'start':
      return { kind: 'start', number: 0, facing };
    case 'container':
      return { kind: 'container', look: choice.look, facing };
    case 'item': {
      const { entry } = choice;
      return {
        kind: 'item',
        image:
          entry.imageVersion !== undefined
            ? images.item(entry.id, entry.imageVersion)
            : null,
        letter: letterOf(entry.name),
        missing: false,
      };
    }
    case 'creature': {
      const { entry } = choice;
      const monster = entry.kind === 'monster';
      const image = monster
        ? entry.imageVersion !== undefined
          ? images.monster(entry.id, entry.imageVersion)
          : null
        : entry.mainImage
          ? images.npc(entry.id, entry.mainImage)
          : null;
      return {
        kind: 'creature',
        side: monster ? 'monster' : 'npc',
        // НПС ставится Средним (objectPlacement.ts).
        size: monster ? (entry.size ?? 'medium') : 'medium',
        facing,
        image,
        letter: letterOf(entry.name),
        missing: false,
        model: null,
      };
    }
    case 'furniture': {
      const model = choice.entry.model ?? null;
      // Обстановка поворачивается только на 90°, как при постановке.
      const turned = rightFacing(facing);
      return {
        kind: 'furniture',
        facing: turned,
        model,
        extent: turnedExtent(
          model?.size ?? choice.entry.modelSize ?? [1, 1, 1],
          turned,
        ),
        mesh: model?.mesh
          ? {
              path: images.furnitureMesh(model.id, model.mesh.version),
              format: model.mesh.format,
              fit: model.mesh.fit,
              color: model.mesh.color,
            }
          : null,
      };
    }
  }
}
