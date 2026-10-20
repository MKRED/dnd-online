import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { GAME_SOCKET, GAME_SOCKET_PATH, type GameJoinAck } from 'shared';
import { TEST_PASSWORD, type TestApp } from './test-app.js';

// Клиенты сокета игры для e2e (docs/plan/game.md, этапы 3 и 6). Приложение должно
// слушать порт: listenForSockets в beforeAll, disconnectAll в afterEach.
export interface SocketClients {
  // Пользователь: агент supertest для REST, строка cookie для сокета и id.
  user(
    login: string,
  ): Promise<{ agent: request.Agent; cookie: string; id: string }>;
  connect(cookie?: string): Promise<Socket>;
  disconnectAll(): void;
}

export async function listenForSockets(t: TestApp): Promise<SocketClients> {
  await t.app.listen(0);
  const { port } = t.app.getHttpServer().address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const sockets: Socket[] = [];
  return {
    async user(login) {
      const agent = await t.loginAs(login);
      const res = await request(t.app.getHttpServer())
        .post('/api/auth/login')
        .send({ login, password: TEST_PASSWORD })
        .expect(200);
      const cookie = (res.headers['set-cookie'] as unknown as string[])
        .map((c) => c.split(';')[0])
        .join('; ');
      const me = await agent.get('/api/auth/me').expect(200);
      return {
        agent,
        cookie,
        id: (me.body as { user: { id: string } }).user.id,
      };
    },
    connect(cookie) {
      const socket = io(url, {
        path: GAME_SOCKET_PATH,
        transports: ['websocket'],
        extraHeaders: cookie ? { cookie } : {},
        reconnection: false,
      });
      sockets.push(socket);
      return new Promise((resolve, reject) => {
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
      });
    },
    disconnectAll() {
      for (const socket of sockets.splice(0)) socket.disconnect();
    },
  };
}

export function join(socket: Socket, gameId: string, afterSeq?: number) {
  return socket.emitWithAck(GAME_SOCKET.join, {
    gameId,
    afterSeq,
  }) as Promise<GameJoinAck>;
}

// Следующее сообщение event, подходящее под условие; не дождались — ошибка.
export function next<T>(
  socket: Socket,
  event: string,
  match: (message: T) => boolean = () => true,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Не пришло ${event}`)),
      2000,
    );
    const handler = (message: T) => {
      if (!match(message)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(message);
    };
    socket.on(event, handler);
  });
}

// Все сообщения event за время ожидания — проверить, что лишнего не пришло.
export async function collect<T>(socket: Socket, event: string, ms = 300) {
  const got: T[] = [];
  const handler = (message: T) => got.push(message);
  socket.on(event, handler);
  await new Promise((resolve) => setTimeout(resolve, ms));
  socket.off(event, handler);
  return got;
}
