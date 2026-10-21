import { IsIn, ValidateBy } from 'class-validator';
import {
  MONSTER_ROLES,
  MONSTER_TYPES,
  isMonsterStatBlock,
  monsterStatBlockProblem,
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
      // Форма проверяет каждое поле сама, сюда доходит только запрос в обход неё (MCP):
      // называем первое неверное поле, иначе неясно, что исправлять.
      defaultMessage: (args) =>
        `Стат-блок монстра задан неверно: ${monsterStatBlockProblem(args?.value)}`,
    },
  })
  statBlock: MonsterStatBlock;

  @IsIn(MONSTER_ROLES, { message: 'Роль монстра — обычный или уникальный' })
  role: MonsterRole;
}
