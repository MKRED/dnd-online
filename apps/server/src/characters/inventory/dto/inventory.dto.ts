import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  INVENTORY_LOCATIONS,
  INVENTORY_MAX_QUANTITY,
  type InventoryAddInput,
  type InventoryEntryPatch,
  type InventoryLocation,
} from 'shared';

const QUANTITY_MESSAGE = `Количество — целое, от 1 до ${INVENTORY_MAX_QUANTITY}`;
const LOCATION_MESSAGE = 'Место — «При себе» или «Хранилище»';

export class AddInventoryItemDto implements InventoryAddInput {
  @IsUUID('all', { message: 'Предмет не найден' })
  itemId: string;

  @IsInt({ message: QUANTITY_MESSAGE })
  @Min(1, { message: QUANTITY_MESSAGE })
  @Max(INVENTORY_MAX_QUANTITY, { message: QUANTITY_MESSAGE })
  quantity: number;

  @IsIn(INVENTORY_LOCATIONS, { message: LOCATION_MESSAGE })
  location: InventoryLocation;
}

// Хотя бы одно поле проверяет сервис: пустое тело — 400 «Нечего менять».
export class UpdateInventoryEntryDto implements InventoryEntryPatch {
  @IsOptional()
  @IsInt({ message: QUANTITY_MESSAGE })
  @Min(1, { message: QUANTITY_MESSAGE })
  @Max(INVENTORY_MAX_QUANTITY, { message: QUANTITY_MESSAGE })
  quantity?: number;

  @IsOptional()
  @IsIn(INVENTORY_LOCATIONS, { message: LOCATION_MESSAGE })
  location?: InventoryLocation;
}
