import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mapBounds,
  type Box3,
  type MapInfo,
  type MapObjectRefsView,
  type SizedMapState,
} from 'shared';
import { ApiError, errorMessage } from '../../lib/apiRequest';
import {
  applyMapOps,
  getMap,
  getMapChunks,
  redoMapEdit,
  renameMap,
  undoMapEdit,
} from './mapsApi';
import { mapStateFromChunks, type MapViewState } from './mapStateFromChunks';
import { useMapEdits, type EditableCopy } from './useMapEdits';

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
// сервер возвращает changeset, и он применяется к локальной копии карты (useMapEdits).
export function useMapData(id: string) {
  const [map, setMap] = useState<LoadedMap | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Номер последнего применённого снимка: запоздавший ответ со старым seq не
  // откатывает карту назад. Копия для правок ставится вместе с ним (useMapEdits).
  const seqRef = useRef(-1);
  const copyRef = useRef<EditableCopy | null>(null);

  useEffect(() => {
    let cancelled = false;
    seqRef.current = -1;
    Promise.all([getMap(id), getMapChunks(id)])
      .then(([info, chunks]) => {
        if (cancelled) return;
        const state = mapStateFromChunks(chunks);
        seqRef.current = chunks.seq;
        copyRef.current = { state, refs: chunks.refs };
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

  // Правку от другого клиента (нейросеть) карта видит только при перечитывании.
  const refresh = useCallback(
    () =>
      getMapChunks(id).then((chunks) => {
        if (chunks.seq < seqRef.current) return;
        const copy = {
          state: mapStateFromChunks(chunks),
          refs: chunks.refs,
        };
        seqRef.current = chunks.seq;
        copyRef.current = copy;
        setMap((prev) => prev && { ...prev, ...copy });
      }),
    [id],
  );

  const onApplied = useCallback(
    (next: EditableCopy) => setMap((prev) => prev && { ...prev, ...next }),
    [],
  );
  const api = useMemo(
    () => ({
      applyOps: (ops: Parameters<typeof applyMapOps>[1]) =>
        applyMapOps(id, ops),
      undo: () => undoMapEdit(id),
      redo: () => redoMapEdit(id),
    }),
    [id],
  );
  const { editError, busy, applyOps, editOps, undo, redo } = useMapEdits({
    copyRef,
    seqRef,
    onApplied,
    refresh,
    api,
  });

  // Новое имя — только в карточку: сцену и историю правок переименование не трогает.
  const rename = useCallback(
    (name: string) =>
      renameMap(id, name).then((info) =>
        setMap(
          (prev) =>
            prev && { ...prev, info: { ...prev.info, name: info.name } },
        ),
      ),
    [id],
  );

  return {
    map,
    loadError,
    editError,
    busy,
    applyOps,
    editOps,
    undo,
    redo,
    rename,
  };
}
