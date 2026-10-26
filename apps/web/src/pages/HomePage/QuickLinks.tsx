import { Group, SimpleGrid, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Bookmark, MapListItem } from 'shared';
import { bookmarkTargetView } from '../BookmarksPage';
import HomeSection from './HomeSection';
import { HOME_LIMITS } from './homeSummary';
import classes from './HomePage.module.css';

interface QuickLinksProps {
  // null — список не загрузился: блок не показывается.
  bookmarks: Bookmark[] | null;
  maps: MapListItem[] | null;
}

function Chips({ children }: { children: ReactNode }) {
  return (
    <Group gap={8} px="md" pb="md">
      {children}
    </Group>
  );
}

// Быстрый доступ: закладки и последние правленые карты (список карт уже отсортирован
// по времени правки) — чипами-ссылками.
function QuickLinks({ bookmarks, maps }: QuickLinksProps) {
  // Закладки, чью цель автор закрыл, на главной не нужны: их разбирают на «Закладках».
  const visible = bookmarks?.filter((b) => b.target) ?? null;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {visible && (
        <HomeSection title="Закладки" more={{ to: '/bookmarks', label: 'Все' }}>
          <Chips>
            {visible.length === 0 && (
              <Text size="sm" c="dimmed">
                Звёздочка на странице персонажа, предмета или монстра добавит
                его сюда.
              </Text>
            )}
            {visible.slice(0, HOME_LIMITS.bookmarks).map((b) => (
              <Link
                key={`${b.kind}-${b.targetId}`}
                to={bookmarkTargetView(b).to}
                className={classes.chip}
              >
                {b.target!.name}
              </Link>
            ))}
          </Chips>
        </HomeSection>
      )}
      {maps && (
        <HomeSection
          title="Недавние карты"
          more={{ to: '/maps', label: 'Все карты' }}
        >
          <Chips>
            {maps.length === 0 && (
              <Text size="sm" c="dimmed">
                Карт пока нет.
              </Text>
            )}
            {maps.slice(0, HOME_LIMITS.maps).map((m) => (
              <Link key={m.id} to={`/maps/${m.id}`} className={classes.chip}>
                {m.name}
              </Link>
            ))}
          </Chips>
        </HomeSection>
      )}
    </SimpleGrid>
  );
}

export default QuickLinks;
