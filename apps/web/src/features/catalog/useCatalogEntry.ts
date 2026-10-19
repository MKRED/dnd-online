import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../lib/apiRequest';

interface Texts {
  // «Предмет не найден», «Способность не найдена»…
  notFound: string;
  // «Не удалось загрузить предмет»…
  failed: string;
}

function toLoadErrorMessage(err: unknown, texts: Texts): string {
  // 400 — id не UUID, 404 — нет такой записи или чужая скрытая: для пользователя одно
  // и то же.
  if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
    return texts.notFound;
  }
  return err instanceof ApiError ? err.message : texts.failed;
}

interface Loaded<Entry> {
  id: string;
  entry: Entry | null;
  error: string | null;
}

// Запись каталога для страниц просмотра и правки. Результат помечен id, для которого он
// загружен: при переходе к другой записи старая не показывается, и сбрасывать состояние
// в эффекте не нужно. load и texts должны быть постоянными (из модуля).
export function useCatalogEntry<Entry>(
  load: (id: string) => Promise<Entry>,
  id: string,
  texts: Texts,
) {
  const [loaded, setLoaded] = useState<Loaded<Entry> | null>(null);

  useEffect(() => {
    let active = true;
    load(id)
      .then((entry) => {
        if (active) setLoaded({ id, entry, error: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to load catalog entry', err);
        if (active)
          setLoaded({ id, entry: null, error: toLoadErrorMessage(err, texts) });
      });
    return () => {
      active = false;
    };
  }, [load, id, texts]);

  // Правка на месте без перезагрузки: строки, которые сервер отдал после изменения
  // (способности монстра).
  const update = useCallback(
    (change: (entry: Entry) => Entry) =>
      setLoaded((prev) =>
        prev?.entry ? { ...prev, entry: change(prev.entry) } : prev,
      ),
    [],
  );

  const current = loaded?.id === id ? loaded : null;
  return {
    entry: current?.entry ?? null,
    error: current?.error ?? null,
    update,
  };
}
