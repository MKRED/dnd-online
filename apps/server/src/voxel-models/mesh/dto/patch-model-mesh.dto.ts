import { IsOptional, Matches, ValidateBy } from 'class-validator';
import { isModelMeshFit, type ModelMeshFit } from 'shared';

// Цвет STL и как вписать файл в клетки модели; без нового файла.
export class PatchModelMeshDto {
  @IsOptional()
  @Matches(/^#[0-9a-f]{6}$/i, { message: 'Цвет — в виде #rrggbb' })
  color?: string;

  @IsOptional()
  @ValidateBy({
    name: 'modelMeshFit',
    validator: {
      validate: isModelMeshFit,
      defaultMessage: () =>
        'Вписывание — {up, turn}: верх y или z, поворот 0–3 четверти',
    },
  })
  fit?: ModelMeshFit;
}
