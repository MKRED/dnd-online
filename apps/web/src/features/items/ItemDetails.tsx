import { Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Item } from 'shared';
import { useImageUrl } from '../../lib/useImageUrls';
import { ItemBadges } from './ItemCollection';
import ItemThumb from './ItemThumb';
import { formatCost, formatWeight } from './itemLabels';
import { itemImagePath } from './itemsApi';

interface ItemDetailsProps {
  item: Item;
  // Кнопки «Редактировать» и «Удалить» — только у автора, их передаёт страница.
  actions?: ReactNode;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text c="dimmed" size="sm" w={88} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm">{children}</Text>
    </Group>
  );
}

// Карточка предмета так, как её видят все: картинка целиком, поля, описание.
function ItemDetails({ item, actions }: ItemDetailsProps) {
  const fullUrl = useImageUrl(
    item.image && itemImagePath(item.id, 'full', item.image.version),
  );

  return (
    <Grid gap="xl">
      <Grid.Col span={{ base: 12, sm: 5 }}>
        {!item.image ? (
          <ItemThumb item={item} placeholderSize="4rem" />
        ) : fullUrl ? (
          <img
            src={fullUrl}
            alt={item.name}
            style={{
              display: 'block',
              maxWidth: '100%',
              // На телефоне картинка над сведениями — высокая не должна их вытеснять.
              maxHeight: '45vh',
              margin: '0 auto',
              borderRadius: 'var(--mantine-radius-md)',
              // Подложка, как у миниатюр: у прозрачной картинки иначе не видно границ.
              background: 'var(--mantine-color-default-hover)',
            }}
          />
        ) : (
          <Loader />
        )}
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <Stack gap="sm">
          <Title order={1} style={{ overflowWrap: 'anywhere' }}>
            {item.name}
          </Title>
          <ItemBadges item={item} showHidden />
          <Stack gap={4}>
            <Field label="Вес">{formatWeight(item.weight)}</Field>
            <Field label="Стоимость">{formatCost(item.cost)}</Field>
            <Field label="Автор">{item.authorNickname}</Field>
          </Stack>
          {item.description && (
            <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {item.description}
            </Text>
          )}
          {actions}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

export default ItemDetails;
