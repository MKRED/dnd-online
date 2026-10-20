import { io, type Socket } from 'socket.io-client';
import { GAME_SOCKET_PATH } from 'shared';
import { API_BASE_URL } from '../../lib/apiBaseUrl';
import { notifySessionExpired, refreshSession } from '../../lib/session';

// Один сокет игры на страницу (docs/plan/game.md, этап 3): открыт, пока он нужен хоть
// одному лобби, и закрывается за последним. Вход — по cookie сессии, как у REST.
let socket: Socket | null = null;
let holders = 0;
// Когда последний раз обновляли сессию из-за отказа сокета: если и после обновления
// сервер не пускает, не крутимся в цикле «обновить — отказ».
let refreshedAt = 0;
const REFRESH_PAUSE_MS = 10_000;

// Сокет живёт на origin API: в dev это другой порт, в проде — тот же, что у страницы.
function socketOrigin(): string {
  return new URL(API_BASE_URL, window.location.href).origin;
}

function createSocket(): Socket {
  const created = io(socketOrigin(), {
    path: GAME_SOCKET_PATH,
    withCredentials: true,
    autoConnect: false,
  });
  created.on('connect_error', (err) => {
    // Сеть — socket.io переподключится сам. Отказ сервера в рукопожатии — нет: обычно
    // это истёкший access-токен (15 минут), его обновляем и входим снова.
    if (err.message !== 'unauthorized') return;
    if (Date.now() - refreshedAt < REFRESH_PAUSE_MS) return;
    refreshedAt = Date.now();
    refreshSession()
      .then((outcome) => {
        if (outcome === 'ok' && holders > 0) created.connect();
        else if (outcome === 'expired') notifySessionExpired();
      })
      .catch((refreshErr: unknown) => {
        console.error('Game socket session refresh failed', refreshErr);
      });
  });
  return created;
}

export function acquireGameSocket(): Socket {
  socket ??= createSocket();
  holders += 1;
  if (!socket.active) socket.connect();
  return socket;
}

export function releaseGameSocket(): void {
  holders = Math.max(0, holders - 1);
  if (holders === 0) socket?.disconnect();
}
