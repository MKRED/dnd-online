import { eq } from 'drizzle-orm';
import type {
  GameEvent,
  GameWalkMessage,
  GameWalker,
  PackedChangeset,
  Vec3,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import { games } from '../../database/schema/index.js';
import { loadEventChanges } from '../scenes/scene-journal.js';
import { findActiveScene } from '../scenes/scene-read.js';
import { loadPlayerFog } from './scene-edit-broadcast.js';

// Путь хода для сокета: мастеру — весь, игрокам — то, что им видно; null — игрокам не шлём.
export interface WalkMessages {
  master: GameWalkMessage;
  player: GameWalkMessage | null;
}

type WalkEvent = Extract<
  GameEvent,
  { kind: 'figure.moved' | 'creature.moved' }
>;

const isWalk = (event: GameEvent): event is WalkEvent =>
  (event.kind === 'figure.moved' || event.kind === 'creature.moved') &&
  Boolean(event.result.path) &&
  Boolean(event.sceneId);

// Существо скрыто от игроков после хода — его пути игрок не видит вовсе.
function hiddenAfter(changes: PackedChangeset | undefined, objectId: number) {
  const change = changes?.objects?.find((c) => c.id === objectId);
  return Boolean(change?.after?.hidden);
}

// Пути ходов из порции журнала, по номеру записи (docs/plan/done/walk-animation.md).
// Игрокам — только для активной открытой сцены, как правки. Фигурки игроки видят всегда,
// их путь уходит целиком; путь монстра или НПС под туманом — посчитанный при записи
// (ScenePlayerFog.walk), без тумана — весь, скрытого существа — никакой.
export async function walkMessages(
  db: Db,
  gameId: string,
  events: GameEvent[],
): Promise<Map<number, WalkMessages>> {
  const result = new Map<number, WalkMessages>();
  const walks = events.filter(isWalk);
  if (walks.length === 0) return result;
  const creatureSeqs = walks
    .filter((event) => event.kind === 'creature.moved')
    .map((event) => event.seq);
  const fogged = await loadPlayerFog(db, gameId, creatureSeqs);
  const changes = await loadEventChanges(db, gameId, creatureSeqs);
  const [game] = await db
    .select({ sceneOpen: games.sceneOpen })
    .from(games)
    .where(eq(games.id, gameId));
  const active = await findActiveScene(db, gameId);
  for (const event of walks) {
    const sceneId = event.sceneId!;
    const path = event.result.path as Vec3[];
    const walker: GameWalker =
      event.kind === 'figure.moved'
        ? { kind: 'figure', characterId: event.intent.characterId }
        : { kind: 'creature', objectId: event.intent.objectId };
    const message = (seen: (Vec3 | null)[]): GameWalkMessage => ({
      gameId,
      sceneId,
      seq: event.seq,
      walker,
      path: seen,
    });
    const shown = Boolean(game?.sceneOpen) && active?.id === sceneId;
    const seen = (): (Vec3 | null)[] | null => {
      if (!shown) return null;
      if (walker.kind === 'figure') return path;
      if (hiddenAfter(changes.get(event.seq), walker.objectId)) return null;
      const delta = fogged.get(event.seq);
      // Под туманом без посчитанного пути (запись старше) игроку не уходит ничего.
      if (delta) return delta.walk ?? null;
      return active?.fog ? null : path;
    };
    const player = seen();
    result.set(event.seq, {
      master: message(path),
      player: player && message(player),
    });
  }
  return result;
}
