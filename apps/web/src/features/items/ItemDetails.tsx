import { Grid, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Item } from 'shared';
import { TitleWithBookmark } from '../bookmarks';
import { DetailsField, EntryImage, SourcesList } from '../catalog';
import EquipmentDetails from './EquipmentDetails';
import { ItemBadges } from './ItemCollection';
import { PackContentsView } from './PackContents';
import {
  TREASURE_KIND_LABELS,
  formatCapacity,
  formatCost,
  formatWeight,
} from './itemLabels';
import { itemImagePath } from './itemsApi';

interface ItemDetailsProps {
  item: Item;
  // Кнопки «Редактировать» и «Удалить» — только у автора, их передаёт страница.
  actions?: ReactNode;
}

// Карточка предмета так, как её видят все: картинка целиком, поля, описание.
function ItemDetails({ item, actions }: ItemDetailsProps) {
  return (
    <Grid gap="xl">
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <EntryImage entry={item} imagePath={itemImagePath} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <Stack gap="sm">
          <TitleWithBookmark kind="item" id={item.id}>
            <Title order={1} style={{ overflowWrap: 'anywhere' }}>
              {item.name}
            </Title>
          </TitleWithBookmark>
          <ItemBadges item={item} showHidden />
          <Stack gap={4}>
            {item.category === 'food' && (
              <DetailsField label="Насыщение">
                {item.details.satiety} очк.
              </DetailsField>
            )}
            {item.category === 'container' && (
              <DetailsField label="Груз">
                {formatCapacity(item.details.capacity)}
              </DetailsField>
            )}
            {item.category === 'treasure' && (
              <DetailsField label="Вид">
                {TREASURE_KIND_LABELS[item.details.kind]}
              </DetailsField>
            )}
            <EquipmentDetails item={item} />
            <DetailsField label="Вес">{formatWeight(item.weight)}</DetailsField>
            <DetailsField label="Стоимость">
              {formatCost(item.cost)}
            </DetailsField>
            <DetailsField label="Автор">{item.authorNickname}</DetailsField>
          </Stack>
          {item.category === 'pack' && (
            <PackContentsView contents={item.details.contents} />
          )}
          {item.description && (
            <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {item.description}
            </Text>
          )}
          <SourcesList sources={item.sources} />
          {actions}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

export default ItemDetails;
