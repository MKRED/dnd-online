import {
  Alert,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameDetail, GameEvent } from 'shared';
import { useAuth } from '../../features/auth';
import {
  deleteGame,
  endSession,
  freeSeat,
  getGame,
  removeMember,
  ROLE_LABELS,
  SESSION_LABEL,
  seatsLabel,
  startSession,
  updateSeat,
  useGameRoom,
} from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';
import FreeSeatCard from './FreeSeatCard';
import GameJournal from './GameJournal';
import LobbyClosed from './LobbyClosed';
import MasterActions from './MasterActions';
import OnlineDot from './OnlineDot';
import SeatCard from './SeatCard';
import TakeSeatModal from './TakeSeatModal';

// Сколько записей, пришедших по сокету, держим для журнала мастера: старше — он
// подгрузит сам.
const LIVE_EVENTS_MAX = 200;

interface LobbyViewProps {
  game: GameDetail;
  onChange: (game: GameDetail) => void;
}

// Лобби: мастер, места (занятые и свободные) и действия по роли смотрящего.
function LobbyView({ game, onChange }: LobbyViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const [journalOpened, setJournalOpened] = useState(false);
  const [liveEvents, setLiveEvents] = useState<GameEvent[]>([]);
  // Растёт, когда живых записей пропущено слишком много: журнал перечитывается целиком.
  const [journalKey, setJournalKey] = useState(0);
  const [closed, setClosed] = useState<'deleted' | 'removed' | null>(null);

  // Изменения других приходят по сокету: лобби перечитывает себя. Потерянный доступ
  // сюда не дойдёт ошибкой — о нём скажет сообщение «комната закрыта».
  const reload = () => {
    getGame(game.id)
      .then(onChange)
      .catch((err: unknown) => console.error('Failed to reload game', err));
  };
  const addLive = (events: GameEvent[]) =>
    setLiveEvents((prev) => [...prev, ...events].slice(-LIVE_EVENTS_MAX));
  const { online } = useGameRoom(game.id, {
    onChanged: reload,
    onEvent: (event) => addLive([event]),
    onResync: (missed) => {
      reload();
      if (missed) {
        addLive(missed);
      } else {
        setLiveEvents([]);
        setJournalKey((key) => key + 1);
      }
    },
    onClosed: setClosed,
  });
  const isMaster = game.role === 'master';
  const freeCount = Math.max(0, game.seatCount - game.seats.length);

  // Одно действие за раз: кнопки гаснут, ошибка показывается над местами.
  const run = (action: () => Promise<void>, failure: string, log: string) => {
    setBusy(true);
    setError(null);
    action()
      .catch((err: unknown) => {
        console.error(log, err);
        setError(errorMessage(err, failure));
      })
      .finally(() => setBusy(false));
  };

  const handleRemove = (userId: string, nickname: string) => {
    if (!window.confirm(`Убрать игрока ${nickname} из игры?`)) return;
    run(
      async () => {
        await removeMember(game.id, userId);
        onChange(await getGame(game.id));
      },
      'Не удалось убрать игрока',
      'Failed to remove game member',
    );
  };

  const handleFree = () => {
    if (!window.confirm('Освободить место? Вы останетесь в лобби.')) return;
    run(
      async () => onChange(await freeSeat(game.id)),
      'Не удалось освободить место',
      'Failed to free seat',
    );
  };

  const handleLeave = () => {
    const back = game.hasPassword
      ? ' Вернуться можно будет только с паролем.'
      : '';
    if (!user || !window.confirm(`Выйти из игры?${back}`)) return;
    run(
      async () => {
        await removeMember(game.id, user.id);
        void navigate('/games');
      },
      'Не удалось выйти из игры',
      'Failed to leave game',
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`Удалить игру «${game.name}» безвозвратно?`)) return;
    run(
      async () => {
        await deleteGame(game.id);
        void navigate('/games');
      },
      'Не удалось удалить игру',
      'Failed to delete game',
    );
  };

  if (closed) return <LobbyClosed reason={closed} />;

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div style={{ minWidth: 0 }}>
          {/* Замок — внутри заголовка: длинное название переносится, замок идёт за ним. */}
          <Title order={1} style={{ overflowWrap: 'anywhere' }}>
            {game.name}
            {game.hasPassword && (
              <>
                {' '}
                <IconLock
                  size={22}
                  aria-label="С паролем"
                  style={{ verticalAlign: 'middle' }}
                />
              </>
            )}
          </Title>
          <Group gap="xs" mt={4}>
            {/* Точка — внутри строки: на телефоне строка переносится, а точка не
                отрывается от имени мастера. */}
            <Text c="dimmed">
              <OnlineDot online={online.includes(game.master.id)} /> Мастер:{' '}
              {game.master.nickname} · {seatsLabel(game)}
            </Text>
            {game.sessionStartedAt && (
              <Badge color="green" variant="light">
                {SESSION_LABEL}
              </Badge>
            )}
            {game.role && (
              <Badge variant="light">{ROLE_LABELS[game.role]}</Badge>
            )}
          </Group>
        </div>
        {isMaster ? (
          <MasterActions
            sessionActive={game.sessionStartedAt !== null}
            busy={busy}
            onStartSession={() =>
              run(
                async () => onChange(await startSession(game.id)),
                'Не удалось начать встречу',
                'Failed to start game session',
              )
            }
            onEndSession={() =>
              run(
                async () => onChange(await endSession(game.id)),
                'Не удалось закончить встречу',
                'Failed to end game session',
              )
            }
            onOpenJournal={() => setJournalOpened(true)}
            onDelete={handleDelete}
          />
        ) : (
          game.role && (
            <Button variant="default" disabled={busy} onClick={handleLeave}>
              Выйти из игры
            </Button>
          )
        )}
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {game.sessionStartedAt && game.role === 'player' && (
        <Text size="sm" c="dimmed">
          Идёт встреча: лист вашего персонажа закрыт для правки до её конца.
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {game.seats.map((seat) => (
          <SeatCard
            key={seat.user.id}
            seat={seat}
            own={seat.user.id === user?.id}
            master={isMaster}
            online={online.includes(seat.user.id)}
            busy={busy}
            onToggleHandover={(allow) =>
              run(
                async () => onChange(await updateSeat(game.id, allow)),
                'Не удалось сохранить разрешение',
                'Failed to update seat',
              )
            }
            onFree={handleFree}
            onRemove={() => handleRemove(seat.user.id, seat.user.nickname)}
          />
        ))}
        {Array.from({ length: freeCount }, (_, i) => (
          <FreeSeatCard
            key={`free-${i}`}
            canTake={!isMaster && game.role !== 'player' && !busy}
            onTake={() => setTaking(true)}
          />
        ))}
      </SimpleGrid>

      {isMaster && (
        <GameJournal
          key={journalKey}
          gameId={game.id}
          live={liveEvents}
          opened={journalOpened}
          onClose={() => setJournalOpened(false)}
        />
      )}

      <TakeSeatModal
        gameId={game.id}
        opened={taking}
        onClose={() => setTaking(false)}
        onSeated={onChange}
      />
    </Stack>
  );
}

export default LobbyView;
