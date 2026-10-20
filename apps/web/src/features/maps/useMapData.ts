import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mapBounds,
  mergeRefsView,
  type Box3,
  type MapEditResult,
  type MapInfo,
  type MapObjectRefsView,
  type MapOp,
  type SizedMapState,
} from 'shared';
import { ApiError, errorMessage } from '../../lib/apiRequest';
import {
  applyMapOps,
  getMap,
  getMapChunks,
  redoMapEdit,
  undoMapEdit,
} from './mapsApi';
import { applyMapChanges } from './applyMapChanges';
import { mapStateFromChunks, type MapViewState } from './mapStateFromChunks';

export interface LoadedMap {
  // Ширину и глубину отсюда не брать: после resize они устаревают, верный размер — state.size.
  info: MapInfo;
  state: MapViewState;
  // Имена, картинки и размеры того, на что ссылаются объекты (или заглушки).
  refs: MapObjectRefsView;
  // Карта на момент открытия: её площадь до верхнего блока. По ней ставится камера,
  // и она не меняется от правок — иначе каждый новый блок сбрасывал бы камеру.
  frame: Box3;
}

function openingFrame({ store, size }: SizedMapState): Box3 {
  const top = mapBounds(store)?.max[1] ?? 0;
  return { min: [0, 0, 0], max: [size.width - 1, top, size.depth - 1] };
}

// Карта страницы /maps/:id: загрузка и правки (операции, undo, redo). После правки
// сервер возвращает changeset, и он применяется к локальной копии карты.
export function useMapData(id: string) {
  const [map, setMap] = useState<LoadedMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Номер последнего применённого снимка: запоздавший ответ со старым seq не
  // откатывает карту назад.
  const seqRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    seqRef.current = -1;
    Promise.all([getMap(id), getMapChunks(id)])
      .then(([info, chunks]) => {
        if (cancelled) return;
        seqRef.current = chunks.seq;
        const state = mapStateFromChunks(chunks);
        setMap({
          info,
          state,
          refs: chunks.refs,
          frame: openingFrame(state),
        });
      })
      .catch((err: unknown) => {
        console.error('Failed to load map', err);
        if (cancelled) return;
        // Не-UUID в адресе сервер отклоняет с 400 — для пользователя это та же «не найдена».
        const notFound =
          err instanceof ApiError && (err.status === 404 || err.status === 400);
        setLoadError(
          notFound
            ? 'Карта не найдена'
            : errorMessage(err, 'Не удалось загрузить карту'),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refresh = useCallback(
    () =>
      getMapChunks(id).then((chunks) => {
        if (chunks.seq < seqRef.current) return;
        seqRef.current = chunks.seq;
        setMap(
          (prev) =>
            prev && {
              ...prev,
              state: mapStateFromChunks(chunks),
              refs: chunks.refs,
            },
        );
      }),
    [id],
  );

  // Правка следует сразу за нашей копией (seq + 1) — применяем её изменения
  // локально. Если между ними вклинились чужие правки (нейросеть) или изменения
  // не легли на копию, перечитываем карту целиком.
  const syncAfterEdit = useCallback(
    (result: MapEditResult): Promise<void> | undefined => {
      // Пачка ничего не изменила — seq не сдвинулся.
      if (result.seq === seqRef.current) return;
      if (map && result.seq === seqRef.current + 1) {
        try {
          const state = applyMapChanges(map.state, result.changes);
          seqRef.current = result.seq;
          setMap({
            ...map,
            state,
            refs: mergeRefsView(map.refs, result.refs),
          });
          return;
        } catch (err) {
          console.error('Map changes did not apply locally, refetching', err);
        }
      }
      return refresh();
    },
    [map, refresh],
  );

  // Правки идут по одной: пока запрос в пути, новые не принимаются (busy),
  // иначе быстрые клики могли бы применяться и перечитываться вперемешку.
  // Промис говорит, прошла ли правка: панель размера закрывается только после успеха.
  const run = useCallback(
    (
      request: () => Promise<MapEditResult>,
      failure: string,
    ): Promise<boolean> => {
      if (busy) return Promise.resolve(false);
      setBusy(true);
      setEditError(null);
      return request()
        .then(async (result) => {
          if (result.conflicts > 0) {
            setEditError(
              `Не тронуто изменений: ${result.conflicts} — эти клетки или объекты уже изменил кто-то другой`,
            );
          }
          await syncAfterEdit(result);
          return true;
        })
        .catch((err: unknown) => {
          console.error(failure, err);
          setEditError(errorMessage(err, failure));
          return false;
        })
        .finally(() => setBusy(false));
    },
    [busy, syncAfterEdit],
  );

  // Ошибку run показывает сам (editError), поэтому клики по сцене и кнопкам промис не ждут;
  // ждёт только панель размера — закрыться после успеха.
  const editOps = useCallback(
    (ops: MapOp[]) =>
      run(() => applyMapOps(id, ops), 'Не удалось изменить карту'),
    [id, run],
  );
  const applyOps = useCallback((ops: MapOp[]) => void editOps(ops), [editOps]);
  const undo = useCallback(
    () => void run(() => undoMapEdit(id), 'Не удалось отменить'),
    [id, run],
  );
  const redo = useCallback(
    () => void run(() => redoMapEdit(id), 'Не удалось вернуть'),
    [id, run],
  );

  return { map, loadError, editError, busy, applyOps, editOps, undo, redo };
}
