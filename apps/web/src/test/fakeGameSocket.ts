import { vi } from 'vitest';
import type { GameJoinAck } from 'shared';

type Handler = (message: unknown) => void;

// Сокет игры для тестов страниц: тест сам решает, что ответит вход в комнату и какие
// сообщения «пришли с сервера». Подключается через vi.mock на features/games/gameSocket.
export function createFakeGameSocket() {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    connected: true,
    active: true,
    joinAck: {
      ok: true,
      seq: 1,
      online: [],
      missed: null,
    } as GameJoinAck,
    on: vi.fn((event: string, handler: Handler) => {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(handler);
      handlers.set(event, set);
    }),
    off: vi.fn((event: string, handler: Handler) => {
      handlers.get(event)?.delete(handler);
    }),
    emit: vi.fn(),
    emitWithAck: vi.fn(() => Promise.resolve(socket.joinAck)),
    connect: vi.fn(),
    disconnect: vi.fn(),
    // Сообщение «с сервера» всем подписчикам.
    receive(event: string, message: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(message);
    },
    reset() {
      handlers.clear();
      socket.joinAck = { ok: true, seq: 1, online: [], missed: null };
    },
  };
  return socket;
}
