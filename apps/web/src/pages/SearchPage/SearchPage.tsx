import {
  Alert,
  Chip,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { isSearchKind, pluralRu, SEARCH_KINDS, SEARCH_LIMIT_MAX } from 'shared';
import {
  SEARCH_GROUP_LABELS,
  SEARCH_MIN_LENGTH,
  searchPagePath,
  useSearchResults,
} from '../../features/search';
import { usePageTitle } from '../../lib/usePageTitle';
import SearchGroupCard from './SearchGroupCard';

// Без выбранного раздела — по десять записей каждого, с ним — сколько отдаёт сервер.
const PER_GROUP = 10;

// Все результаты общего поиска (/search?q=…&kind=…): чипы разделов с числами и записи
// группами. Сюда ведут «ещё N» и «Все результаты» из выпадающего списка в шапке.
function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const rawKind = params.get('kind');
  const kind = isSearchKind(rawKind) ? rawKind : undefined;
  usePageTitle(q ? `Поиск «${q}»` : 'Поиск');
  // Числа для чипов — всегда по всем разделам; записи — по выбранному.
  const all = useSearchResults(q, { limit: PER_GROUP });
  const one = useSearchResults(kind ? q : '', {
    kind,
    limit: SEARCH_LIMIT_MAX,
  });

  const setKind = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (isSearchKind(next)) nextParams.set('kind', next);
    else nextParams.delete('kind');
    // Чип — не новая страница: «Назад» уводит с поиска, а не перебирает чипы.
    setParams(nextParams, { replace: true });
  };

  if (q.length < SEARCH_MIN_LENGTH) {
    return (
      <Container size="md" py="xl">
        <Title order={1} mb="sm">
          Поиск
        </Title>
        <Text c="dimmed">
          Наберите хотя бы две буквы в поле поиска вверху страницы — или нажмите
          «/».
        </Text>
      </Container>
    );
  }

  const shown = kind ? one : all;
  const groups = all.result?.groups.filter((group) => group.total > 0) ?? [];
  const total = groups.reduce((sum, group) => sum + group.total, 0);

  return (
    <Container size="md" py="xl">
      <Title order={1}>Поиск «{q}»</Title>
      <Text c="dimmed" mt={4} mb="lg">
        {all.result
          ? total > 0
            ? `${total} ${pluralRu(total, ['результат', 'результата', 'результатов'])} в ${groups.length} ${pluralRu(groups.length, ['разделе', 'разделах', 'разделах'])}: ваши записи и опубликованные в каталоге`
            : 'Ваши записи и опубликованные в каталоге'
          : ' '}
      </Text>
      {all.error ? (
        <Alert color="red" title="Ошибка">
          {all.error}
        </Alert>
      ) : !all.result ? (
        <Loader />
      ) : total === 0 ? (
        <Text c="dimmed">Ничего не нашлось. Попробуйте часть слова.</Text>
      ) : (
        <Stack gap="lg">
          <Chip.Group value={kind ?? 'all'} onChange={setKind}>
            <Group gap={6} role="group" aria-label="Разделы">
              <Chip value="all" size="sm">
                Все{' '}
                <Text span size="xs" c="inherit" opacity={0.7}>
                  {total}
                </Text>
              </Chip>
              {groups.map((group) => (
                <Chip key={group.kind} value={group.kind} size="sm">
                  {SEARCH_GROUP_LABELS[group.kind]}{' '}
                  <Text span size="xs" c="inherit" opacity={0.7}>
                    {group.total}
                  </Text>
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          {/* Чипы остаются на месте, пока грузится выбранный раздел. */}
          {shown.error ? (
            <Alert color="red" title="Ошибка">
              {shown.error}
            </Alert>
          ) : !shown.result || shown.loading ? (
            <Loader />
          ) : (
            SEARCH_KINDS.map((k) =>
              shown.result?.groups.find((g) => g.kind === k && g.total > 0),
            )
              .filter((group) => group !== undefined)
              .map((group) => (
                <SearchGroupCard
                  key={group.kind}
                  group={group}
                  query={q}
                  moreTo={
                    !kind && group.total > group.hits.length
                      ? searchPagePath(q, group.kind)
                      : null
                  }
                />
              ))
          )}
        </Stack>
      )}
    </Container>
  );
}

export default SearchPage;
