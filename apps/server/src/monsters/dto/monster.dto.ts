import { IsIn, ValidateBy } from 'class-validator';
import {
  MONSTER_ROLES,
  MONSTER_TYPES,
  isMonsterStatBlock,
  type MonsterRole,
  type MonsterStatBlock,
  type MonsterType,
} from 'shared';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование монстра — одно и то же тело. Поля и пределы стат-блока
// — в shared (monsterStatBlockCheck.ts).
export class MonsterDto extends CatalogEntryDto {
  @IsIn(MONSTER_TYPES, { message: 'Неизвестный тип существа' })
  category: MonsterType;

  @ValidateBy({
    name: 'monsterStatBlock',
    validator: {
      validate: isMonsterStatBlock,
      // Общий текст на весь стат-блок: форма проверяет каждое поле сама, сюда доходит
      // только запрос в обход неё.
      defaultMessage: () => 'Стат-блок монстра задан неверно',
    },
  })
  statBlock: MonsterStatBlock;

  @IsIn(MONSTER_ROLES, { message: 'Роль монстра — обычный или уникальный' })
  role: MonsterRole;
}
