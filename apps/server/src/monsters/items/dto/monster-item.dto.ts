import { applyDecorators } from '@nestjs/common';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import {
  INVENTORY_MAX_QUANTITY,
  type MonsterItemAddInput,
  type MonsterItemUpdateInput,
} from 'shared';
import {
  MONSTER_ITEM_NOT_FOUND,
  MONSTER_ITEM_QUANTITY,
} from '../monster-items.messages.js';

// Количество — как в инвентаре персонажа.
const Quantity = () =>
  applyDecorators(
    IsInt({ message: MONSTER_ITEM_QUANTITY }),
    Min(1, { message: MONSTER_ITEM_QUANTITY }),
    Max(INVENTORY_MAX_QUANTITY, { message: MONSTER_ITEM_QUANTITY }),
  );

export class AddMonsterItemDto implements MonsterItemAddInput {
  @IsUUID('all', { message: MONSTER_ITEM_NOT_FOUND })
  itemId: string;

  @Quantity()
  quantity: number;
}

export class UpdateMonsterItemDto implements MonsterItemUpdateInput {
  @Quantity()
  quantity: number;
}
