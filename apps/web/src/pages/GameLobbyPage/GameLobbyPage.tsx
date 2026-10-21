import { Alert, Anchor, Container, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GameDetail } from 'shared';
import { getGame } from '../../features/games';
import { ApiError, errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import LobbyPassword from './LobbyPassword';
import LobbyView from './LobbyView';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; game: GameDetail }
  // Закрытая игра, а смотрящий ещё не вводил пароль (сервер ответил 403).
  | { kind: 'locked' }
  | { kind: 'error'; message: string };

// Лобби игры /games/:id (docs/plan/done/game.md, этап 1).
function GameLobbyPage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  usePageTitle(state.kind === 'ready' ? state.game.name : 'Игра');

  useEffect(() => {
    let cancelled = false;
    getGame(id)
      .then((game) => {
        if (!cancelled) setState({ kind: 'ready', game });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setState({ kind: 'locked' });
          return;
        }
        console.error('Failed to load game', err);
        setState({
          kind: 'error',
          message: errorMessage(err, 'Не удалось загрузить игру'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ready = (game: GameDetail) => setState({ kind: 'ready', game });

  return (
    <Container size="md" py="xl">
      <Anchor component={Link} to="/games" size="sm" mb="md" display="block">
        ← Все игры
      </Anchor>
      {state.kind === 'loading' && <Loader />}
      {state.kind === 'error' && <Alert color="red">{state.message}</Alert>}
      {state.kind === 'locked' && (
        <LobbyPassword gameId={id} onEntered={ready} />
      )}
      {state.kind === 'ready' && (
        <LobbyView game={state.game} onChange={ready} />
      )}
    </Container>
  );
}

export default GameLobbyPage;
