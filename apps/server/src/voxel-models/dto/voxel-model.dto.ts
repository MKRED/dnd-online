import { ValidateBy } from 'class-validator';
import {
  checkVoxelModel,
  isModelCells,
  isModelPalette,
  isModelSize,
  type ModelCellKind,
  type Vec3,
  type VoxelModelFields,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование модели — одно тело, все поля обязательны.
export class VoxelModelDto extends CatalogEntryDto implements VoxelModelFields {
  @ValidateBy({
    name: 'modelSize',
    validator: {
      validate: isModelSize,
      defaultMessage: () =>
        'Размер модели — [x, y, z] в клетках, от 1 до 8 по каждой оси',
    },
  })
  size: Vec3;

  @ValidateBy({
    name: 'modelPalette',
    validator: {
      validate: isModelPalette,
      defaultMessage: () => 'Палитра — до 255 цветов в виде #rrggbb',
    },
  })
  palette: string[];

  // Сами воксели проверяются вместе с размером, палитрой и клетками: длина — по
  // размеру, цвета — по палитре, клетки — внутри модели.
  @ValidateBy({
    name: 'modelVoxels',
    validator: {
      validate: (_value, args) =>
        checkVoxelModel(args!.object as VoxelModelFields) === null,
      defaultMessage: (args) =>
        checkVoxelModel(args!.object as VoxelModelFields) ?? 'Модель испорчена',
    },
  })
  voxels: string;

  @ValidateBy({
    name: 'modelCells',
    validator: {
      validate: isModelCells,
      defaultMessage: () =>
        'Свойства клеток — объект {"x,y,z": obstacle | difficult | free | stand}',
    },
  })
  cells: Record<string, ModelCellKind>;
}
