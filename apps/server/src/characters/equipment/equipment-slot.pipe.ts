import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { EQUIP_SLOTS, type EquipSlot } from 'shared';

// Место куклы из адреса: неизвестное — 400.
export class ParseEquipSlotPipe implements PipeTransform<string, EquipSlot> {
  transform(value: string): EquipSlot {
    if (!(EQUIP_SLOTS as readonly string[]).includes(value)) {
      throw new BadRequestException('Нет такого места на кукле');
    }
    return value as EquipSlot;
  }
}
