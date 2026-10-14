import { useEffect, useState } from 'react';
import type { Item } from 'shared';
import { initialDraft } from './imageDraft';

// Черновик картинки формы. Выбранный файл показывается через object URL: его нужно
// освободить, когда файл заменили, убрали или ушли со страницы, иначе он висит в памяти
// до закрытия вкладки.
export function useImageDraft(item: Item | null) {
  const [draft, setDraft] = useState(() => initialDraft(item));
  const url = draft.kind === 'new' ? draft.url : null;
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return [draft, setDraft] as const;
}
