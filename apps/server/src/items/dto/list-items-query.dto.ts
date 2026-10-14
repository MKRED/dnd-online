import { IsIn } from 'class-validator';
import { ITEM_LIST_SCOPES, type ItemListScope } from 'shared';

export class ListItemsQueryDto {
  @IsIn(ITEM_LIST_SCOPES, { message: 'Список — mine или catalog' })
  scope: ItemListScope;
}
