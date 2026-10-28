import { useEffect, useRef } from 'react';

// Вкладка «Участники» прокручивается одна целиком, и карточка выбранного стоит над списком:
// выбрал существо внизу длинного списка (или на сцене) — карточка оказалась бы за верхним
// краем. Вкладка сама едет к ней, если карточка видна не целиком (решение Михаила
// 2026-10-28, вариант А). offsetTop — от вкладки: у неё position: relative.
export function useScrollToSelected(selectedKey: string | null) {
  const tabRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const tab = tabRef.current;
    const card = selectedRef.current;
    if (!selectedKey || !tab || !card) return;
    const top = card.offsetTop;
    const seen =
      top >= tab.scrollTop &&
      top + card.offsetHeight <= tab.scrollTop + tab.clientHeight;
    if (seen) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tab.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
  }, [selectedKey]);
  return { tabRef, selectedRef };
}
