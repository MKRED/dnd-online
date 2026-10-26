import { IsUUID } from 'class-validator';
import type { EquipInput } from 'shared';

export class EquipDto implements EquipInput {
  @IsUUID('all', { message: 'Вещь не найдена в инвентаре' })
  entryId: string;
}
