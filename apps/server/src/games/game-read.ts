import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type {
  GameDetail,
  GameEventCharacter,
  GameListItem,
  GameRole,
} from 'shared';
import type {
  DatabaseService,
  DbTransaction,
} from '../database/database.service.js';
import {
  characters,
  gameMembers,
  games,
  users,
} from '../database/schema/index.js';
import { GAME_LOCKED, GAME_NOT_FOUND } from './game-errors.js';
import { findActiveScene, sceneStatus } from './scenes/scene-read.js';

type Db = DatabaseService['db'];
type GameRow = typeof games.$inferSelect;
type MemberRow = typeof gameMembers.$inferSelect;

// Управляющий персонажем — тоже пользователь: вторая копия users в запросе мест.
const controllers = alias(users, 'controllers');

function roleOf(
  game: GameRow,
  viewerId: string,
  member: Pick<MemberRow, 'characterId'> | undefined,
): GameRole {
  if (game.masterId === viewerId) return 'master';
  if (!member) return null;
  return member.characterId ? 'player' : 'member';
}

function toListItem(
  game: GameRow,
  masterNickname: string,
  takenSeats: number,
  role: GameRole,
): GameListItem {
  return {
    id: game.id,
    name: game.name,
    master: { id: game.masterId, nickname: masterNickname },
    seatCount: game.seatCount,
    takenSeats,
    hasPassword: game.passwordHash !== null,
    role,
    sessionStartedAt: game.sessionStartedAt?.toISOString() ?? null,
    createdAt: game.createdAt.toISOString(),
  };
}

// Общий список: сначала игры смотрящего (мастер или участник), дальше — новые сверху.
// Закрытые игры видны в списке тоже, пароль закрывает только лобби.
export async function listGames(
  db: Db,
  viewerId: string,
): Promise<GameListItem[]> {
  const mine = db
    .select({
      gameId: gameMembers.gameId,
      characterId: gameMembers.characterId,
    })
    .from(gameMembers)
    .where(eq(gameMembers.userId, viewerId))
    .as('mine');
  const rows = await db
    .select({
      game: games,
      masterNickname: users.nickname,
      takenSeats: sql<number>`(select count(*)::int from ${gameMembers} where ${gameMembers.gameId} = ${games.id} and ${gameMembers.characterId} is not null)`,
      // У того, кто в игру не входил, обе колонки — null.
      memberGameId: mine.gameId,
      memberCharacterId: mine.characterId,
    })
    .from(games)
    .innerJoin(users, eq(users.id, games.masterId))
    .leftJoin(mine, eq(mine.gameId, games.id))
    .orderBy(desc(games.createdAt));
  const items = rows.map((row) =>
    toListItem(
      row.game,
      row.masterNickname,
      row.takenSeats,
      roleOf(
        row.game,
        viewerId,
        row.memberGameId ? { characterId: row.memberCharacterId } : undefined,
      ),
    ),
  );
  // sort стабильный: внутри групп остаётся порядок «новые сверху».
  return items.sort(
    (a, b) => Number(b.role !== null) - Number(a.role !== null),
  );
}

// Игра и участие смотрящего в ней — для проверок доступа до чтения и правок.
export async function findGameAccess(db: Db, gameId: string, viewerId: string) {
  const [row] = await db
    .select({ game: games, member: gameMembers })
    .from(games)
    .leftJoin(
      gameMembers,
      and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, viewerId)),
    )
    .where(eq(games.id, gameId))
    .limit(1);
  if (!row) throw new NotFoundException(GAME_NOT_FOUND);
  const { game } = row;
  const member = row.member ?? undefined;
  // В открытое лобби может заглянуть любой вошедший, в закрытое — мастер и участники.
  const canView =
    game.masterId === viewerId || member !== undefined || !game.passwordHash;
  return { game, member, canView };
}

// Участник игры и персонаж на его месте (null — в лобби без места); undefined — не
// участник. Имя персонажа нужно журналу: запись читается и после удаления персонажа.
export async function findMemberSeat(
  db: Db | DbTransaction,
  gameId: string,
  userId: string,
): Promise<{ character: GameEventCharacter | null } | undefined> {
  const [row] = await db
    .select({ id: characters.id, name: characters.name })
    .from(gameMembers)
    .leftJoin(characters, eq(characters.id, gameMembers.characterId))
    .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
    .limit(1);
  if (!row) return undefined;
  return {
    character: row.id && row.name ? { id: row.id, name: row.name } : null,
  };
}

// Лобби: игра с занятыми местами. Закрытое без входа — 403, страница спросит пароль.
export async function readGameDetail(
  db: Db,
  gameId: string,
  viewerId: string,
): Promise<GameDetail> {
  const { game, member, canView } = await findGameAccess(db, gameId, viewerId);
  if (!canView) throw new ForbiddenException(GAME_LOCKED);
  const [master] = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.id, game.masterId))
    .limit(1);
  const seats = await db
    .select({
      member: gameMembers,
      nickname: users.nickname,
      controller: { id: controllers.id, nickname: controllers.nickname },
      character: {
        id: characters.id,
        name: characters.name,
        species: characters.species,
        classes: characters.classes,
      },
    })
    .from(gameMembers)
    .innerJoin(users, eq(users.id, gameMembers.userId))
    .innerJoin(characters, eq(characters.id, gameMembers.characterId))
    .leftJoin(controllers, eq(controllers.id, gameMembers.controllerId))
    .where(
      and(eq(gameMembers.gameId, gameId), isNotNull(gameMembers.characterId)),
    )
    .orderBy(asc(gameMembers.seatedAt));
  const scene = await findActiveScene(db, gameId);
  const isMaster = game.masterId === viewerId;
  // Участники — мастеру: из них он выбирает управляющего (этап 7).
  const members = isMaster
    ? await db
        .select({ id: users.id, nickname: users.nickname })
        .from(gameMembers)
        .innerJoin(users, eq(users.id, gameMembers.userId))
        .where(eq(gameMembers.gameId, gameId))
        .orderBy(asc(users.nickname))
    : [];
  return {
    ...toListItem(
      game,
      master.nickname,
      seats.length,
      roleOf(game, viewerId, member),
    ),
    seats: seats.map((row) => ({
      user: { id: row.member.userId, nickname: row.nickname },
      character: row.character,
      allowHandover: row.member.allowHandover,
      controller: row.controller?.id
        ? { id: row.controller.id, nickname: row.controller.nickname }
        : null,
      seatedAt: (row.member.seatedAt ?? row.member.joinedAt).toISOString(),
    })),
    scene: sceneStatus(scene, game.sceneOpen, isMaster),
    eventSeq: game.eventSeq,
    members,
  };
}
