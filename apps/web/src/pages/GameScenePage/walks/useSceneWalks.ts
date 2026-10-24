import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameWalkMessage, MapObject, MapObjects, Vec3 } from 'shared';
import {
  figureWalkKey,
  objectWalkKey,
  walkDuration,
  type SceneWalk,
} from '../../../features/maps/MapScene/walks/sceneWalk';

// Ход отправлен, а пути ещё нет: дольше этого фигурка его не ждёт (отказ сервера, обрыв).
const HOLD_MS = 1500;
// После хода путь держится ещё столько: у других клиентов перечитанные фигурки могут
// прийти позже пути, и без него фигурка на миг вернулась бы на старое место.
const LINGER_MS = 1500;

const endOf = (walk: SceneWalk) =>
  walk.startedAt +
  (walk.kind === 'hold' ? HOLD_MS : walkDuration(walk) + LINGER_MS);

interface SceneWalksOptions {
  sceneId: string | null;
  // Частота анимаций из настроек графики: 0 — без анимаций, фигурки встают сразу.
  enabled: boolean;
  // Объекты сцены, как их видит смотрящий: существо, уходящее из поля зрения, правка
  // уберёт — его запоминаем, пока оно не дойдёт до тумана.
  objects: MapObjects | null;
}

// Ходы по пути на странице сцены (docs/plan/done/walk-animation.md): путь из game:walked
// по ключу фигурки или объекта; новый ход того же существа заменяет прежний. hold — свой
// ход отправлен: держать фигурку на месте, пока не придёт путь.
export function useSceneWalks({
  sceneId,
  enabled,
  objects,
}: SceneWalksOptions) {
  const [walks, setWalks] = useState<ReadonlyMap<string, SceneWalk>>(
    () => new Map(),
  );
  const [departed, setDeparted] = useState<ReadonlyMap<number, MapObject>>(
    () => new Map(),
  );
  // Последний номер хода по ключу: путь, пришедший дважды (после обрыва), не играется снова.
  const seqs = useRef(new Map<string, number>());

  const receive = useCallback(
    (message: GameWalkMessage) => {
      if (!enabled || message.sceneId !== sceneId) return;
      const { walker } = message;
      const key =
        walker.kind === 'figure'
          ? figureWalkKey(walker.characterId)
          : objectWalkKey(walker.objectId);
      if ((seqs.current.get(key) ?? -1) >= message.seq) return;
      seqs.current.set(key, message.seq);
      setWalks((prev) =>
        new Map(prev).set(key, {
          kind: 'walk',
          seq: message.seq,
          path: message.path,
          startedAt: performance.now(),
        }),
      );
      // Путь приходит раньше правки: существо ещё на старом месте.
      const object =
        walker.kind === 'creature' && objects?.byId.get(walker.objectId);
      if (object) {
        setDeparted((prev) => new Map(prev).set(object.id, object));
      }
    },
    [enabled, sceneId, objects],
  );

  const hold = useCallback(
    (key: string, at: Vec3) => {
      if (!enabled) return;
      setWalks((prev) =>
        new Map(prev).set(key, {
          kind: 'hold',
          at,
          startedAt: performance.now(),
        }),
      );
    },
    [enabled],
  );

  // Закончившиеся ходы и ожидания убираются по таймеру ближайшего конца.
  useEffect(() => {
    if (walks.size === 0) return;
    const soonest = Math.min(...[...walks.values()].map(endOf));
    const timer = setTimeout(
      () => {
        const now = performance.now();
        setWalks((prev) => {
          const next = new Map([...prev].filter(([, w]) => endOf(w) > now));
          return next.size === prev.size ? prev : next;
        });
        setDeparted((prev) => {
          const next = new Map(
            [...prev].filter(([id]) => {
              const walk = walks.get(objectWalkKey(id));
              return walk !== undefined && endOf(walk) > now;
            }),
          );
          return next.size === prev.size ? prev : next;
        });
      },
      Math.max(0, soonest - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [walks]);

  return { walks, departed, receive, hold };
}

export type SceneWalksApi = ReturnType<typeof useSceneWalks>;
