import {
  objectRefIds,
  type GameLibraryRef,
  type MapObjects,
  type MapOp,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  loadRefs,
  type LoadedRefs,
  type RefIds,
} from '../../maps/objects/map-object-refs.js';
import { opsRefIds, unionIds } from '../../maps/objects/map-object-edit.js';
import { copyToLibrary } from '../library/library-copy.js';
import { sceneRefs } from './scene-refs.js';

// Ссылки для правки сцены (docs/plan/done/game.md, этап 6). Новое — то, чего ещё нет в
// библиотеке игры, — проверяется по правилам редактора карты (своё или опубликованное,
// свой НПС с видом «НПС») и копируется в библиотеку глазами мастера в той же транзакции.
// Размеры, роли и веса для editMap — уже из копий: правка справочника идущую игру не
// трогает. Чего нет ни в библиотеке, ни в доступном мастеру справочнике, в ссылках нет,
// и editMap отклонит постановку.
export async function loadSceneEditRefs(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  objects: MapObjects,
  ops: MapOp[],
): Promise<LoadedRefs & { libraryCopied: number }> {
  const wanted = opsRefIds(ops);
  const { refs: present } = await sceneRefs(tx, gameId, wanted);
  const fresh: RefIds = {
    monsters: without(wanted.monsters, present.monsters),
    items: without(wanted.items, present.items),
    npcs: without(wanted.npcs, present.npcs),
  };
  const libraryCopied = await copyFresh(tx, gameId, masterId, fresh);
  const all = unionIds(objectRefIds(objects.byId.values()), wanted);
  return { ...(await sceneRefs(tx, gameId, all)), libraryCopied };
}

function without(
  ids: Set<string>,
  present: { has: (id: string) => boolean },
): Set<string> {
  return new Set([...ids].filter((id) => !present.has(id)));
}

async function copyFresh(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  fresh: RefIds,
): Promise<number> {
  if (fresh.monsters.size + fresh.items.size + fresh.npcs.size === 0) return 0;
  const { refs } = await loadRefs(tx, masterId, fresh);
  const roots: GameLibraryRef[] = [
    ...[...fresh.monsters]
      .filter((id) => refs.monsters.get(id)?.usable)
      .map((sourceId) => ({ kind: 'monster' as const, sourceId })),
    ...[...fresh.items]
      .filter((id) => refs.items.has(id))
      .map((sourceId) => ({ kind: 'item' as const, sourceId })),
    ...[...fresh.npcs]
      .filter((id) => refs.npcs.has(id))
      .map((sourceId) => ({ kind: 'npc' as const, sourceId })),
  ];
  return roots.length === 0 ? 0 : copyToLibrary(tx, gameId, masterId, roots);
}
