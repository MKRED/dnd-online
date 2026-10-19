import { INVENTORY_MAX_QUANTITY } from 'shared';

// Ошибки снаряжения монстра; интерфейс показывает их как есть.
export const MONSTER_ITEM_NOT_FOUND = 'Предмет не найден';
export const MONSTER_ITEM_ALREADY = 'Предмет уже есть в снаряжении';
export const MONSTER_ITEM_ENTRY_NOT_FOUND = 'Предмет у монстра не найден';
export const MONSTER_ITEM_QUANTITY = `Количество — целое, от 1 до ${INVENTORY_MAX_QUANTITY}`;
