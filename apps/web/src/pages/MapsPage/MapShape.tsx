import type { MapSize } from 'shared';
import classes from './MapsPage.module.css';

interface MapShapeProps {
  size: MapSize;
  // Сторона квадрата, в который вписана карта, px.
  box: number;
}

// Схема карты вместо снимка (снимков пока нет): клетчатый прямоугольник с пропорциями
// ширины и глубины, чтобы длинную карту было видно с первого взгляда.
function MapShape({ size, box }: MapShapeProps) {
  const long = Math.max(size.width, size.depth);
  const w = Math.max(4, Math.round((box * size.width) / long));
  const h = Math.max(4, Math.round((box * size.depth) / long));
  return (
    <span
      aria-hidden
      className={classes.shape}
      style={{ width: w, height: h }}
    />
  );
}

export default MapShape;
