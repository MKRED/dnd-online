import { useEffect, useState } from 'react';
import type { HealthMarkStyle } from 'shared';
import { drawHealthMark, MARK_FONTS } from '../../../features/maps';
import classes from './HealthMarkPreview.module.css';

// Две метки — «Ранен» и «Повержен» — на полоске цвета сцены, картинками с холста: так
// превью совпадает со сценой. Рисуются, когда шрифт загружен.
function HealthMarkPreview({ style }: { style: HealthMarkStyle }) {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const draw = () => {
      if (!active) return;
      setImages(
        (
          [
            ['Ранен', 'bloodied'],
            ['Повержен', 'down'],
          ] as const
        ).flatMap(([label, health]) => {
          const canvas = drawHealthMark(style, label, health);
          return canvas ? [canvas.toDataURL()] : [];
        }),
      );
    };
    // У jsdom в тестах document.fonts есть, но без load.
    const fonts = document.fonts as FontFaceSet | undefined;
    if (typeof fonts?.load !== 'function') {
      draw();
    } else {
      fonts
        .load(MARK_FONTS[style])
        .catch((err: unknown) => {
          console.error('Health mark preview font failed to load', err);
        })
        .finally(draw);
    }
    return () => {
      active = false;
    };
  }, [style]);
  return (
    <div className={classes.strip} aria-hidden>
      {images.map((src) => (
        <img key={src} src={src} alt="" className={classes.mark} />
      ))}
    </div>
  );
}

export default HealthMarkPreview;
