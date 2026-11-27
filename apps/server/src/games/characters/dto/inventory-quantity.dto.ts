import { IsInt, Max, Min } from 'class-validator';
import { INVENTORY_MAX_QUANTITY } from 'shared';

const QUANTITY_MESSAGE = `Количество — целое, от 1 до ${INVENTORY_MAX_QUANTITY}`;

// Новое количество строки инвентаря героя (docs/plan/gm-items.md, этап 1).
export class GameInventoryQuantityDto {
  @IsInt({ message: QUANTITY_MESSAGE })
  @Min(1, { message: QUANTITY_MESSAGE })
  @Max(INVENTORY_MAX_QUANTITY, { message: QUANTITY_MESSAGE })
  quantity: number;
}
