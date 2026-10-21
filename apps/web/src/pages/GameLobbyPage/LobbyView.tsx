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
import {
  CREATURE_KINDS,
  FIGURE_KINDS,
  SCENE_EDIT_KINDS,
  type GameDetail,
  type GameEvent,
} from 'shared';
import { useAuth } from '../../features/auth';
import {
  deleteGame,
  endSession,
  freeSeat,
  getGame,
  removeMember,
  ROLE_LABELS,
  scenePagePath,
  SESSION_LABEL,
  seatsLabel,
  startSession,
  setSeatController,
  updateSeat,
  useGameRoom,
} from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';
import FreeSeatCard from './FreeSeatCard';
import GameJournal from './GameJournal';
import GameLibrary from './GameLibrary';
import GameScenes, { SceneInvite } from './GameScenes';
import LobbyClosed from './LobbyClosed';
import MasterActions from './MasterActions';
import OnlineDot from './OnlineDot';
import SeatCard from './SeatCard';
import TakeSeatModal from './TakeSeatModal';

// Сколько записей, пришедших по сокету, держим для журнала мастера: старше — он
// подгрузит сам.
const LIVE_EVENTS_MAX = 200;

// Изменения игры, после которых в библиотеке другие записи.
const LIBRARY_CHANGES = new Set<string>([
  'session.started',
  'library.refreshed',
  'scene.created',
  'scene.restarted',
]);

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
  const [libraryOpened, setLibraryOpened] = useState(false);
  // Растёт, когда в игре скопировали или обновили записи библиотеки: открытая шторка
  // перечитывает себя.
  const [libraryVersion, setLibraryVersion] = useState(0);
  // Растёт, когда сцены поменялись (в том числе из другой вкладки мастера).
  const [scenesVersion, setScenesVersion] = useState(0);
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
  const isMaster = game.role === 'master';
  const { online } = useGameRoom(
    game.id,
    {
      onChanged: (message) => {
        // Мастер открыл сцену — игроков из лобби переводит на неё (docs/plan/game.md,
        // этап 5). Мастера не переводит: он открывает сам.
        if (!isMaster && message.kind === 'scene.opened') {
          void navigate(scenePagePath(game.id));
          return;
        }
        // Правки сцены (этап 6), фигурки (этап 7) и состояние персонажей (этап 8) лобби
        // не меняют: они идут часто, и каждая перечитывала бы лобби у всех. Запись мастеру
        // всё равно придёт в журнал; наложенный эффект мог лечь в библиотеку.
        if (
          SCENE_EDIT_KINDS.includes(message.kind) ||
          FIGURE_KINDS.includes(message.kind) ||
          CREATURE_KINDS.includes(message.kind)
        ) {
          if (message.kind === 'character.effect_added')
            setLibraryVersion((version) => version + 1);
          return;
        }
        reload();
        if (LIBRARY_CHANGES.has(message.kind))
          setLibraryVersion((version) => version + 1);
        if (message.kind.startsWith('scene.'))
          setScenesVersion((version) => version + 1);
      },
      onEvent: (event) => {
        addLive([event]);
        // Правка сцены поставила новое из справочников — оно уже в библиотеке.
        if (event.kind === 'scene.edited' && event.result.libraryCopied > 0)
          setLibraryVersion((version) => version + 1);
      },
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
    },
    game.eventSeq,
  );
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
            onOpenLibrary={() => setLibraryOpened(true)}
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
      {!isMaster && game.scene && (
        <SceneInvite gameId={game.id} scene={game.scene} />
      )}
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
            candidates={game.members.filter((m) => m.id !== seat.user.id)}
            onController={(controllerId) =>
              run(
                async () =>
                  onChange(
                    await setSeatController(
                      game.id,
                      seat.user.id,
                      controllerId,
                    ),
                  ),
                'Не удалось передать управление',
                'Failed to set seat controller',
              )
            }
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
        <GameScenes
          gameId={game.id}
          version={scenesVersion}
          onChanged={reload}
        />
      )}

      {isMaster && (
        <GameJournal
          key={journalKey}
          gameId={game.id}
          live={liveEvents}
          opened={journalOpened}
          onClose={() => setJournalOpened(false)}
        />
      )}
      {isMaster && (
        <GameLibrary
          gameId={game.id}
          version={libraryVersion}
          opened={libraryOpened}
          onClose={() => setLibraryOpened(false)}
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
