import type { MantineTransition } from '@mantine/core';
import { useEffect, useState, type CSSProperties } from 'react';

export interface ZoomedViewport {
  // Положение и размер слоя — для подложки и содержимого просмотрщика.
  box: CSSProperties;
  // Анимация содержимого: штатная задаёт `transform` сама и затёрла бы наш масштаб.
  transition: MantineTransition;
}

// Слой на видимую часть страницы, если её приблизили щипком; иначе — штатный `inset: 0`.
// При масштабе 1 ничего не трогаем: на десктопе размер видимой части считается ещё до того,
// как просмотрщик спрячет полосу прокрутки, и слой вышел бы на её ширину уже экрана.
function readZoomedViewport(): ZoomedViewport | undefined {
  const viewport = window.visualViewport;
  if (!viewport || Math.abs(viewport.scale - 1) < 0.01) return undefined;
  const { offsetTop, offsetLeft, width, height, scale } = viewport;
  // Слой размером с экран при масштабе 1, уменьшенный обратно на масштаб страницы, —
  // выглядит так же, как без зума, и закрывает ровно то, что видно.
  const shrink = (factor: number) => `scale(${factor / scale})`;
  return {
    box: {
      inset: 'auto',
      top: offsetTop,
      left: offsetLeft,
      width: width * scale,
      height: height * scale,
    },
    transition: {
      common: { transformOrigin: '0 0' },
      in: { opacity: 1, transform: shrink(1) },
      out: { opacity: 0, transform: shrink(0.95) },
      transitionProperty: 'transform, opacity',
    },
  };
}

// `position: fixed; inset: 0` привязан к layout viewport. Если на телефоне страницу
// приблизили щипком, видимая часть — лишь кусок его, и просмотрщик открывается
// увеличенным и сдвинутым: кнопки панели оказываются за краем экрана.
export function useZoomedViewport(): ZoomedViewport | undefined {
  const [zoomed, setZoomed] = useState(readZoomedViewport);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setZoomed(readZoomedViewport());
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return zoomed;
}
