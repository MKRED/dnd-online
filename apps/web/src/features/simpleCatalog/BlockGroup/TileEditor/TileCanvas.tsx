import { useEffect, useRef, type PointerEvent } from 'react';
import { TILE_SIZE, type Tile } from '../../../maps';
import classes from './TileEditor.module.css';

interface TileCanvasProps {
  tile: Tile;
  onDown: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onUp: () => void;
}

// Холст 16×16: настоящий canvas на 16 пикселей, растянутый CSS без сглаживания, под ним
// шахматка (видно дыры), поверх — сетка пикселей. Указатель захватывается на мазок,
// поэтому линия не обрывается, если мышь на миг вышла за край.
function TileCanvas({ tile, onDown, onMove, onUp }: TileCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // В jsdom у canvas нет контекста — там холст просто пустой.
    const context = canvas.current?.getContext('2d');
    context?.putImageData(
      new ImageData(new Uint8ClampedArray(tile), TILE_SIZE),
      0,
      0,
    );
  }, [tile]);

  const cell = (event: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    const at = (offset: number, size: number) =>
      Math.min(
        TILE_SIZE - 1,
        Math.max(0, Math.floor((offset / size) * TILE_SIZE)),
      );
    return [
      at(event.clientX - rect.left, rect.width),
      at(event.clientY - rect.top, rect.height),
    ];
  };

  return (
    <div className={classes.canvasFrame}>
      <canvas
        ref={canvas}
        width={TILE_SIZE}
        height={TILE_SIZE}
        className={classes.canvas}
        aria-label="Холст текстуры 16×16"
        onPointerDown={(event) => {
          // Только основная кнопка мыши, палец или перо.
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          onDown(...cell(event));
        }}
        onPointerMove={(event) => {
          if (event.buttons & 1) onMove(...cell(event));
        }}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
      />
      <div className={classes.grid} aria-hidden />
    </div>
  );
}

export default TileCanvas;
