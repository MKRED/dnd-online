import { Anchor, Group, Paper, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { SearchGroup } from 'shared';
import {
  SEARCH_GROUP_LABELS,
  SearchHit,
  searchHitDetails,
  searchHitPath,
} from '../../features/search';
import classes from './SearchPage.module.css';

interface SearchGroupCardProps {
  group: SearchGroup;
  query: string;
  // Показаны не все записи группы: ссылка на неё одну.
  moreTo: string | null;
}

// Чья запись справочника; персонажи и карты всегда свои — им подписи нет.
function ownerOf(hit: SearchGroup['hits'][number]): string | undefined {
  if (!('mine' in hit)) return undefined;
  return hit.mine ? 'Моё' : `автор ${hit.authorNickname}`;
}

// Раздел страницы всех результатов: заголовок с числом найденного и записи ссылками.
function SearchGroupCard({ group, query, moreTo }: SearchGroupCardProps) {
  const details = searchHitDetails(group);
  const label = SEARCH_GROUP_LABELS[group.kind];
  return (
    <Paper withBorder radius="md" component="section" aria-label={label}>
      <Group justify="space-between" className={classes.groupHead}>
        <Title order={2} size="h5">
          {label} · {group.total}
        </Title>
        {moreTo && (
          <Anchor component={Link} to={moreTo} size="sm" replace>
            Все {group.total}
          </Anchor>
        )}
      </Group>
      {group.hits.map((hit, i) => (
        <Link
          key={hit.id}
          to={searchHitPath(group.kind, hit.id)}
          className={classes.row}
        >
          <SearchHit
            kind={group.kind}
            name={hit.name}
            query={query}
            detail={details[i]}
            owner={ownerOf(hit)}
          />
        </Link>
      ))}
      {!moreTo && group.hits.length < group.total && (
        <Text size="sm" c="dimmed" className={classes.groupHead}>
          Показаны первые {group.hits.length} — уточните запрос.
        </Text>
      )}
    </Paper>
  );
}

export default SearchGroupCard;
