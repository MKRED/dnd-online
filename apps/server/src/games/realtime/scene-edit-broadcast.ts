import { eq } from 'drizzle-orm';
import {
  SCENE_EDIT_KINDS,
  type GameEvent,
  type GameSceneEditMessage,
  type MapObject,
  type PackedChangeset,
  type SceneEditResult,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { games } from '../../database/schema/index.js';
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

// Сообщения о правках сцены из порции журнала (docs/plan/game.md, этап 6), по номеру
// записи. Открыта ли сцена — на момент рассылки: правку, сделанную при закрытой сцене,
// игрок всё равно увидит, когда её откроют, — вместе со всей сценой.
export async function sceneEditMessages(
  db: Db,
  gameId: string,
  events: GameEvent[],
): Promise<Map<number, SceneEditMessages>> {
  const edits = events.filter(
    (event) => SCENE_EDIT_KINDS.includes(event.kind) && event.sceneId,
  );
  const messages = new Map<number, SceneEditMessages>();
  if (edits.length === 0) return messages;
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
  for (const event of edits) {
    const sceneId = event.sceneId!;
    const full = changes.get(event.seq) ?? { cells: [], paletteAdded: [] };
    const base = {
      gameId,
      sceneId,
      seq: (event.result as SceneEditResult).sceneSeq,
    };
    const visible = Boolean(game?.sceneOpen) && active?.id === sceneId;
    const seen = visible ? playerChanges(full) : null;
    messages.set(event.seq, {
      master: {
        ...base,
        changes: full,
        refs: await sceneRefsView(db, gameId, touched(full)),
      },
      player: seen && {
        ...base,
        changes: seen,
        refs: await sceneRefsView(db, gameId, touched(seen)),
      },
    });
  }
  return messages;
}

// Объекты, которые остались на сцене после правки: им нужен справочник ссылок.
function touched(changes: PackedChangeset): MapObject[] {
  return (changes.objects ?? []).flatMap((c) => (c.after ? [c.after] : []));
}
