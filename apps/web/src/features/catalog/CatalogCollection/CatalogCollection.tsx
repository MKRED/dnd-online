import { Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogImage } from 'shared';
import type { ImagePathFn } from '../catalogApi';
import CatalogThumb from '../CatalogThumb';
import classes from './CatalogCollection.module.css';

export type CatalogCollectionView = 'grid' | 'list';

interface CollectionEntry {
  id: string;
  name: string;
  image: CatalogImage | null;
  authorNickname: string;
}

interface CatalogCollectionProps<Entry extends CollectionEntry> {
  entries: Entry[];
  view: CatalogCollectionView;
  // В каталоге записи чужие — показываем автора.
  scope: 'mine' | 'catalog';
  // Адрес карточки записи: /items/:id, /abilities/:id…
  basePath: string;
  imagePath: ImagePathFn;
  badges: (entry: Entry) => ReactNode;
  // Числа записи (у предмета — вес и цена, у эффекта — длительность): в сетке строкой
  // под бейджами, в списке — колонкой справа, чтобы их было удобно сравнивать. Нет —
  // ничего не показываем.
  numbers?: (
    entry: Entry,
  ) => { primary: string; secondary?: string } | undefined;
  // Своя миниатюра вместо картинки записи: у группы блоков — сам блок.
  thumb?: (entry: Entry, size: 'grid' | 'row') => ReactNode;
}

// Записи каталога сеткой карточек (узнать по картинке) или списком (сравнить числа).
function CatalogCollection<Entry extends CollectionEntry>({
  entries,
  view,
  scope,
  basePath,
  imagePath,
  badges,
  numbers,
  thumb,
}: CatalogCollectionProps<Entry>) {
  const mine = scope === 'mine';

  if (view === 'list') {
    return (
      <Stack gap="xs">
        {entries.map((entry) => {
          const values = numbers?.(entry);
          return (
            <Link
              key={entry.id}
              to={`${basePath}/${entry.id}`}
              className={classes.row}
            >
              <Group wrap="nowrap" gap="sm">
                <div className={classes.rowThumb}>
                  {thumb ? (
                    <div className={classes.ownThumb}>
                      {thumb(entry, 'row')}
                    </div>
                  ) : (
                    <CatalogThumb
                      entry={entry}
                      imagePath={imagePath}
                      placeholderSize="1.25rem"
                    />
                  )}
                </div>
                <div className={classes.rowMain}>
                  <Text fw={600} truncate>
                    {entry.name}
                  </Text>
                  <Group gap="xs">
                    {badges(entry)}
                    {!mine && (
                      <Text size="xs" c="dimmed" truncate>
                        {entry.authorNickname}
                      </Text>
                    )}
                  </Group>
                </div>
                {values && (
                  <div className={classes.rowNumbers}>
                    <Text size="sm">{values.primary}</Text>
                    {values.secondary && (
                      <Text size="sm" c="dimmed">
                        {values.secondary}
                      </Text>
                    )}
                  </div>
                )}
              </Group>
            </Link>
          );
        })}
      </Stack>
    );
  }

  return (
    <div className={classes.grid}>
      {entries.map((entry) => {
        const values = numbers?.(entry);
        return (
          <Link
            key={entry.id}
            to={`${basePath}/${entry.id}`}
            className={classes.card}
          >
            {thumb ? (
              <div className={classes.ownThumb}>{thumb(entry, 'grid')}</div>
            ) : (
              <CatalogThumb entry={entry} imagePath={imagePath} />
            )}
            <Stack gap={4} mt="xs">
              <Text fw={600} size="sm" lineClamp={2} className={classes.name}>
                {entry.name}
              </Text>
              {badges(entry)}
              {values && (
                <Text size="xs" c="dimmed">
                  {values.secondary
                    ? `${values.primary} · ${values.secondary}`
                    : values.primary}
                </Text>
              )}
              {!mine && (
                <Text size="xs" c="dimmed" truncate>
                  {entry.authorNickname}
                </Text>
              )}
            </Stack>
          </Link>
        );
      })}
    </div>
  );
}

export default CatalogCollection;
