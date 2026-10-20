import { IoAdapter } from '@nestjs/platform-socket.io';
import { GAME_SOCKET_PATH } from 'shared';
import type { Server, ServerOptions } from 'socket.io';

// Socket.IO с тем же CORS, что у REST (configure-app.ts): в dev веб на другом порту и
// шлёт cookie сессии, в проде всё с одного origin. Настройка шлюза в декораторе
// читается при импорте, раньше .env, поэтому FRONTEND_URL берётся здесь.
export class GameSocketAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    // ServerOptions в socket.io описан со всеми полями обязательными, хотя сам Server
    // принимает любую их часть; Nest передаёт сюда только заданные в декораторе.
    const merged = {
      ...options,
      path: options?.path ?? GAME_SOCKET_PATH,
      cors: {
        origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
        credentials: true,
      },
    } as ServerOptions;
    return super.createIOServer(port, merged);
  }
}
