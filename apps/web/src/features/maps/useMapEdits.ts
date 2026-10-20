import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  mergeRefsView,
  type MapEditResult,
  type MapObjectRefsView,
  type MapOp,
  type PackedChangeset,
} from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { applyMapChanges } from './applyMapChanges';
import type { MapViewState } from './mapStateFromChunks';

// Куда уходят правки: карта в редакторе или сцена игры (docs/plan/game.md, этап 6).
export interface MapEditApi {
  applyOps: (ops: MapOp[]) => Promise<MapEditResult>;
  undo: () => Promise<MapEditResult>;
  redo: () => Promise<MapEditResult>;
}

// Локальная копия: блоки и объекты, справочник их ссылок.
export interface EditableCopy {
  state: MapViewState;
  refs: MapObjectRefsView;
}

interface MapEditsOptions {
  copy: EditableCopy | null;
  // Номер последней правки в копии. Его ставит и чтение целиком (refresh).
  seqRef: RefObject<number>;
  // Новая копия после правки с номером seq.
  onApplied: (next: EditableCopy, seq: number) => void;
  // Перечитать целиком: правка не легла на копию или между ними был пропуск.
  refresh: () => Promise<void> | void;
  api: MapEditApi;
}

// Правки копии карты или сцены: свои — запросом, по одной; чужие (вторая вкладка,
// мастер для игрока) — сообщением сокета. И те, и другие приходят как changeset с номером
// правки (receive): следующая за копией применяется к ней, уже применённая (ответ на свою
// правку и то же сообщение сокета) пропускается, после пропуска копия перечитывается.
export function useMapEdits({
  copy,
  seqRef,
  onApplied,
  refresh,
  api,
}: MapEditsOptions) {
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Последняя копия — в ref: два сообщения сокета подряд приходят до перерисовки, и
  // второе легло бы на копию без первого.
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const receive = useCallback(
    (
      seq: number,
      changes: PackedChangeset,
      refs: MapObjectRefsView,
    ): Promise<void> | void => {
      if (seq <= seqRef.current) return;
      const current = copyRef.current;
      if (current && seq === seqRef.current + 1) {
        try {
          const next = {
            state: applyMapChanges(current.state, changes),
            refs: mergeRefsView(current.refs, refs),
          };
          seqRef.current = seq;
          copyRef.current = next;
          onApplied(next, seq);
          return;
        } catch (err) {
          console.error('Map changes did not apply locally, refetching', err);
        }
      }
      return refresh();
    },
    [seqRef, onApplied, refresh],
  );

  // Свои правки идут по одной: пока запрос в пути, новые не принимаются (busy), иначе
  // быстрые клики применялись бы и перечитывались вперемешку. Промис говорит, прошла ли
  // правка: панель размера закрывается только после успеха.
  const run = useCallback(
    (request: () => Promise<MapEditResult>, failure: string) => {
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
          await receive(result.seq, result.changes, result.refs);
          return true;
        })
        .catch((err: unknown) => {
          console.error(failure, err);
          setEditError(errorMessage(err, failure));
          return false;
        })
        .finally(() => setBusy(false));
    },
    [busy, receive],
  );

  // Ошибку run показывает сам (editError), поэтому клики по сцене и кнопкам промис не
  // ждут; ждёт только панель размера — закрыться после успеха.
  const editOps = useCallback(
    (ops: MapOp[]) => run(() => api.applyOps(ops), 'Не удалось изменить карту'),
    [api, run],
  );
  const applyOps = useCallback((ops: MapOp[]) => void editOps(ops), [editOps]);
  const undo = useCallback(
    () => void run(api.undo, 'Не удалось отменить'),
    [api, run],
  );
  const redo = useCallback(
    () => void run(api.redo, 'Не удалось вернуть'),
    [api, run],
  );

  return { editError, busy, receive, applyOps, editOps, undo, redo };
}
