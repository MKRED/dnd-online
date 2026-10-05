import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mapBounds,
  type Box3,
  type MapEditResult,
  type MapInfo,
  type MapOp,
  type MapState,
} from 'shared';
import { ApiError, errorMessage } from '../../lib/apiRequest';
import {
  applyMapOps,
  getMap,
  getMapChunks,
  redoMapEdit,
  undoMapEdit,
} from './mapsApi';
import { mapStateFromChunks } from './mapStateFromChunks';

// Кадр камеры для пустой карты: участок 16×16 у начала координат.
const EMPTY_FRAME: Box3 = { min: [0, 0, 0], max: [15, 0, 15] };

export interface LoadedMap {
  info: MapInfo;
  state: MapState;
  // Границы карты на момент открытия. По ним ставится камера, и они не меняются
  // от правок — иначе каждый новый блок сбрасывал бы камеру пользователя.
  frame: Box3;
}

// Карта страницы /maps/:id: загрузка и правки (операции, undo, redo). После правки
// чанки перечитываются целиком — изменения других участников (нейросети) приходят заодно.
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
        setMap({ info, state, frame: mapBounds(state.store) ?? EMPTY_FRAME });
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
          (prev) => prev && { ...prev, state: mapStateFromChunks(chunks) },
        );
      }),
    [id],
  );

  // Правки идут по одной: пока запрос в пути, новые не принимаются (busy),
  // иначе быстрые клики могли бы применяться и перечитываться вперемешку.
  const run = useCallback(
    (request: () => Promise<MapEditResult>, failure: string) => {
      if (busy) return;
      setBusy(true);
      setEditError(null);
      request()
        .then((result) => {
          if (result.conflicts > 0) {
            setEditError(
              `Не тронуто клеток: ${result.conflicts} — их уже изменил кто-то другой`,
            );
          }
          return refresh();
        })
        .catch((err: unknown) => {
          console.error(failure, err);
          setEditError(errorMessage(err, failure));
        })
        .finally(() => setBusy(false));
    },
    [busy, refresh],
  );

  const applyOps = useCallback(
    (ops: MapOp[]) =>
      run(() => applyMapOps(id, ops), 'Не удалось изменить карту'),
    [id, run],
  );
  const undo = useCallback(
    () => run(() => undoMapEdit(id), 'Не удалось отменить'),
    [id, run],
  );
  const redo = useCallback(
    () => run(() => redoMapEdit(id), 'Не удалось вернуть'),
    [id, run],
  );

  return { map, loadError, editError, busy, applyOps, undo, redo };
}
