import {
  Alert,
  Container,
  Grid,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMemo } from 'react';
import { useAuth } from '../../features/auth';
import { usePageTitle } from '../../lib/usePageTitle';
import CharacterStrip from './CharacterStrip';
import HomeHeader from './HomeHeader';
import {
  greeting,
  joinableGames,
  myGames,
  runningGames,
  seatedIn,
  summaryLine,
} from './homeSummary';
import JoinableGamesCard from './JoinableGamesCard';
import MyGamesCard from './MyGamesCard';
import NewcomerSteps from './NewcomerSteps';
import NowPlayingCard from './NowPlayingCard';
import QuickLinks from './QuickLinks';
import { useHomeData } from './useHomeData';

// Главная «Пульт»: что идёт сейчас, свои игры, куда можно сесть, свои персонажи,
// закладки и недавние карты. Новичку вместо этого — три шага. Собрана из тех же
// ответов API, что и разделы.
function HomePage() {
  usePageTitle();
  const { user } = useAuth();
  const { data } = useHomeData();
  const now = useMemo(() => new Date(), []);
  const nickname = user?.nickname ?? '';

  if (!data) {
    return (
      <Container size="lg" py="xl">
        <Loader />
      </Container>
    );
  }

  const games = data.games ?? [];
  const mine = myGames(games);
  const joinable = joinableGames(games);
  const hasCharacter = (data.characters ?? []).some((c) => c.kind === 'pc');
  // Новичок — когда всё загрузилось и пусто: при ошибке не стоит звать начинать заново.
  const newcomer =
    data.errors.length === 0 &&
    data.characters!.length === 0 &&
    mine.length === 0 &&
    data.maps!.length === 0;

  const errorAlert = data.errors.length > 0 && (
    <Alert color="red" title="Не всё загрузилось">
      Не удалось загрузить: {data.errors.join(', ')}. Обновите страницу.
    </Alert>
  );

  if (newcomer) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={1} fz={{ base: 22, sm: 30 }}>
              Добро пожаловать за стол, {nickname}
            </Title>
            <Text c="dimmed" mt={8} maw={640}>
              Здесь будут ваши игры и персонажи. Начните с героя: с ним можно
              сесть в чужую игру или позвать друзей в свою.
            </Text>
          </div>
          <NewcomerSteps />
          <JoinableGamesCard
            title="Ищут игроков"
            games={joinable}
            hasCharacter={false}
          />
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <HomeHeader
          title={`${greeting(now)}, ${nickname}`}
          subtitle={summaryLine(games)}
        />
        {errorAlert}
        {runningGames(games).map((game) => (
          <NowPlayingCard
            key={game.id}
            game={game}
            detail={data.details.find((d) => d.id === game.id)}
            now={now}
          />
        ))}
        {/* Персонажи — в той же сетке, чтобы на телефоне встать между своими играми и
            «Можно сесть», как в макете; на широком экране они ниже обеих колонок. */}
        <Grid gap="md">
          {data.games && (
            <Grid.Col span={{ base: 12, md: 7 }} order={1}>
              <MyGamesCard
                games={mine}
                details={data.details}
                userId={user?.id ?? ''}
              />
            </Grid.Col>
          )}
          {data.games && (
            <Grid.Col span={{ base: 12, md: 5 }} order={{ base: 3, md: 2 }}>
              <JoinableGamesCard
                title="Можно сесть"
                games={joinable}
                hasCharacter={hasCharacter}
              />
            </Grid.Col>
          )}
          {data.characters && (
            <Grid.Col span={12} order={{ base: 2, md: 3 }}>
              <CharacterStrip
                characters={data.characters}
                seated={seatedIn(data.details)}
              />
            </Grid.Col>
          )}
        </Grid>
        <QuickLinks bookmarks={data.bookmarks} maps={data.maps} />
      </Stack>
    </Container>
  );
}

export default HomePage;
