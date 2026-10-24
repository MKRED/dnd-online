import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import {
  SCENE_EDIT_KINDS,
  type GameEvent,
  type GameSceneEditMessage,
  type GameSceneFogMessage,
  type MapObject,
  type PackedChangeset,
  type SceneEditResult,
  type ScenePlayerFog,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { gameEvents, games } from '../../database/schema/index.js';
import { playerChanges } from '../scenes/scene-player-view.js';
import { loadEventChanges } from '../scenes/scene-journal.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { sceneRefsView } from '../scenes/scene-refs.js';

// Правка сцены для сокета: мастеру и игрокам. player — null, если игрокам её не шлём:
// сцена не активная или закрыта (тайная подготовка, решено с пользователем 2026-10-21).
export interface SceneEditMessages {
  master: GameSceneEditMessage;
  player: GameSceneEditMessage | null;
}

export interface SceneMessages {
  edits: Map<number, SceneEditMessages>;
  // Туман игроков изменился без правки сцены (docs/plan/done/fog-of-war.md, этап 4).
  fog: Map<number, GameSceneFogMessage>;
}

// Разница тумана игрокам, посчитанная в транзакции записи (game_events.player_fog).
export async function loadPlayerFog(
  db: Db,
  gameId: string,
  seqs: number[],
): Promise<Map<number, ScenePlayerFog>> {
  if (seqs.length === 0) return new Map();
  const rows = await db
    .select({ seq: gameEvents.seq, playerFog: gameEvents.playerFog })
    .from(gameEvents)
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        inArray(gameEvents.seq, seqs),
        isNotNull(gameEvents.playerFog),
      ),
    );
  return new Map(rows.map(({ seq, playerFog }) => [seq, playerFog!]));
}

// Сообщения о правках сцены и тумане из порции журнала (docs/plan/done/game.md, этап 6),
// по номеру записи. Открыта ли сцена — на момент рассылки: правку, сделанную при закрытой
// сцене, игрок всё равно увидит, когда её откроют, — вместе со всей сценой. Что игроку
// видно под туманом, посчитано при записи: маски на момент рассылки могли уже уйти вперёд.
export async function sceneMessages(
  db: Db,
  gameId: string,
  events: GameEvent[],
): Promise<SceneMessages> {
  const result: SceneMessages = { edits: new Map(), fog: new Map() };
  const edits = events.filter(
    (event) => SCENE_EDIT_KINDS.includes(event.kind) && event.sceneId,
  );
  const fogged = await loadPlayerFog(
    db,
    gameId,
    events.map((event) => event.seq),
  );
  if (edits.length === 0 && fogged.size === 0) return result;
  const changes = await loadEventChanges(
    db,
    gameId,
    edits.map((event) => event.seq),
  );
  const [game] = await db
    .select({ sceneOpen: games.sceneOpen })
    .from(games)
    .where(eq(games.id, gameId));
  const active = await findActiveScene(db, gameId);
  const shown = (sceneId: string) =>
    Boolean(game?.sceneOpen) && active?.id === sceneId;
  for (const event of edits) {
    const sceneId = event.sceneId!;
    const full = changes.get(event.seq) ?? { cells: [], paletteAdded: [] };
    const base = {
      gameId,
      sceneId,
      seq: (event.result as SceneEditResult).sceneSeq,
    };
    const delta = fogged.get(event.seq);
    const seen: Pick<GameSceneEditMessage, 'changes' | 'fog'> | null = !shown(
      sceneId,
    )
      ? null
      : delta
        ? { changes: delta.changes, fog: delta.fog }
        : // Под туманом без посчитанной разницы игроку не уходит ничего, кроме номера.
          {
            changes: active?.fog
              ? { cells: [], paletteAdded: full.paletteAdded }
              : playerChanges(full),
          };
    result.edits.set(event.seq, {
      master: {
        ...base,
        changes: full,
        refs: await sceneRefsView(db, gameId, touched(full)),
      },
      player: seen && {
        ...base,
        ...seen,
        refs: await sceneRefsView(db, gameId, touched(seen.changes)),
      },
    });
  }
  for (const event of events) {
    const delta = fogged.get(event.seq);
    if (!delta || result.edits.has(event.seq) || !shown(delta.sceneId)) {
      continue;
    }
    result.fog.set(event.seq, {
      gameId,
      sceneId: delta.sceneId,
      seq: delta.seq,
      changes: delta.changes,
      fog: delta.fog,
      refs: await sceneRefsView(db, gameId, touched(delta.changes)),
    });
  }
  return result;
}

// Объекты, которые остались на сцене после правки: им нужен справочник ссылок.
function touched(changes: PackedChangeset): MapObject[] {
  return (changes.objects ?? []).flatMap((c) => (c.after ? [c.after] : []));
}
