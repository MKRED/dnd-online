import { and, eq } from 'drizzle-orm';
import {
  GAME_SOCKET,
  insideMap,
  type GameFigureDragMessage,
  type Vec3,
} from 'shared';
import type { DatabaseService } from '../../database/database.service.js';
import {
  characters,
  gameFigures,
  gameMembers,
  gameScenes,
  games,
} from '../../database/schema/index.js';
import { canMoveFigure } from '../figures/figure-read.js';
import {
  gameRoom,
  type GameServer,
  type GameSocket,
} from './game-socket.types.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isCell = (value: unknown): value is Vec3 =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((v) => Number.isInteger(v));

// Сообщение клиента — как GameFigureDragMessage, иначе null: присылает его кто угодно.
export function parseFigureDrag(body: unknown): GameFigureDragMessage | null {
  if (typeof body !== 'object' || body === null) return null;
  const { gameId, characterId, at } = body as Record<string, unknown>;
  if (typeof gameId !== 'string' || !UUID.test(gameId)) return null;
  if (typeof characterId !== 'string' || !UUID.test(characterId)) return null;
  if (at !== null && !isCell(at)) return null;
  return { gameId, characterId, at };
}

// Куда тянут фигурку (docs/plan/game.md, этап 7) — остальным в комнате, без базы и
// журнала. Тянуть может тот, кто водит фигурку: мастер — всегда, владелец — пока сцена
// открыта; клетка — внутри сцены. Игрокам позиция уходит только при открытой сцене.
// false — сообщение отброшено.
export async function relayFigureDrag(
  databaseService: DatabaseService,
  server: GameServer,
  socket: GameSocket,
  message: GameFigureDragMessage,
): Promise<boolean> {
  const { gameId, characterId, at } = message;
  if (!socket.data.games.has(gameId)) return false;
  const [row] = await databaseService.db
    .select({
      masterId: games.masterId,
      open: games.sceneOpen,
      ownerId: characters.userId,
      controllerId: gameMembers.controllerId,
      width: gameScenes.width,
      depth: gameScenes.depth,
    })
    .from(gameFigures)
    .innerJoin(games, eq(games.id, gameFigures.gameId))
    .innerJoin(characters, eq(characters.id, gameFigures.characterId))
    .innerJoin(gameScenes, eq(gameScenes.id, gameFigures.sceneId))
    .leftJoin(gameMembers, eq(gameMembers.characterId, gameFigures.characterId))
    .where(
      and(
        eq(gameFigures.gameId, gameId),
        eq(gameFigures.characterId, characterId),
      ),
    );
  if (!row) return false;
  const { userId } = socket.data;
  const master = userId === row.masterId;
  if (!canMoveFigure(userId, row.masterId, row.ownerId, row.controllerId)) {
    return false;
  }
  if (!master && !row.open) return false;
  if (at && !insideMap(at, { width: row.width, depth: row.depth })) {
    return false;
  }
  const sockets = await server.in(gameRoom(gameId)).fetchSockets();
  for (const other of sockets) {
    if (other.id === socket.id) continue;
    if (other.data.userId !== row.masterId && !row.open) continue;
    other.emit(GAME_SOCKET.figureDragged, message);
  }
  return true;
}
