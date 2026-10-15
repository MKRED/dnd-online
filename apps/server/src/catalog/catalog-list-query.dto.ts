import { IsIn } from 'class-validator';
import { CATALOG_LIST_SCOPES, type CatalogListScope } from 'shared';

export class ListCatalogQueryDto {
  @IsIn(CATALOG_LIST_SCOPES, { message: 'Список — mine или catalog' })
  scope: CatalogListScope;
}
