import { Loader } from '@mantine/core';
import { IconFlag } from '@tabler/icons-react';
import { builtinContainerModel } from 'shared';
import { useImageUrl } from '../../../../lib/useImageUrls';
import { characterImagePath } from '../../../characters/characterImagesApi';
import { itemImagePath } from '../../../items';
import { monstersApi } from '../../../monsters/monstersApi';
import { ModelThumbnail } from '../../../voxelModels';
import type { CatalogChoice } from '../objects/objectPlacement';
import classes from './PlacePicker.module.css';
import { objectChoiceName, type ObjectChoice } from './placeChoice';

// Миниатюра записи каталога с сервера: монстра и предмета — из каталога, НПС — главная
// картинка. Справочники, а не библиотека игры: ставит мастер своё или опубликованное.
function catalogImagePath(entry: CatalogChoice): string | null {
  if (entry.kind === 'npc')
    return entry.mainImage
      ? characterImagePath(
          entry.id,
          entry.mainImage.id,
          'thumb',
          entry.mainImage.thumbVersion,
        )
      : null;
  if (entry.imageVersion === undefined) return null;
  return entry.kind === 'monster'
    ? monstersApi.imagePath(entry.id, 'thumb', entry.imageVersion)
    : itemImagePath(entry.id, 'thumb', entry.imageVersion);
}

// Первая буква названия — как у записи без картинки в списках каталога.
function Letter({ name, size }: { name: string; size: number }) {
  return (
    <span
      className={classes.letter}
      style={{ fontSize: Math.round(size * 0.45) }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function CatalogImage({ path, size }: { path: string; size: number }) {
  const url = useImageUrl(path);
  if (!url) return <Loader size="xs" />;
  return (
    <img
      className={classes.image}
      src={url}
      width={size}
      height={size}
      alt=""
    />
  );
}

// Картинка того, что ставится (docs/plan/blocks.md, этап 10): модель обстановки и
// встроенного контейнера рисуется, как в списке «Обстановки»; у предмета, монстра и НПС —
// их миниатюра. Нечего показать — первая буква названия.
function ChoicePicture({
  choice,
  size,
}: {
  choice: ObjectChoice;
  size: number;
}) {
  if (choice.kind === 'start')
    return <IconFlag size={size * 0.7} stroke={1.5} />;
  if (choice.kind === 'container')
    return (
      <ModelThumbnail
        cacheKey={`container:${choice.look}`}
        model={builtinContainerModel(choice.look)}
        size={size}
      />
    );
  const { entry } = choice;
  if (entry.kind === 'furniture') {
    const { model } = entry;
    return model ? (
      <ModelThumbnail
        // Модель правят отдельно от записи: ключ — по её цветам и вокселям, как в списке.
        cacheKey={`${model.id}:${model.palette.join('')}:${model.voxels.length}`}
        model={model}
        size={size}
      />
    ) : (
      <Letter name={entry.name} size={size} />
    );
  }
  const path = catalogImagePath(entry);
  return path ? (
    <CatalogImage path={path} size={size} />
  ) : (
    <Letter name={objectChoiceName(choice)} size={size} />
  );
}

export default ChoicePicture;
