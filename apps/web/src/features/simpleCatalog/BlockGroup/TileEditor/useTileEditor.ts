import { useRef, useState } from 'react';
import type { Tile } from '../../../maps';
import {
  commit,
  commitStroke,
  preview,
  redo,
  startHistory,
  undo,
} from './tileHistory';
import { floodFill, linePoints, paintPixels, pixelAt } from './tilePixels';

export type TileTool = 'pencil' | 'fill' | 'picker' | 'eraser';

// Состояние редактора плитки: инструмент, цвет и история правок. Холст сообщает только
// клетку под указателем, а что с ней делать — решает инструмент здесь.
export function useTileEditor(initial: Tile, initialColor: string) {
  const [history, setHistory] = useState(() => startHistory(initial));
  const [tool, setTool] = useState<TileTool>('pencil');
  const [color, setColor] = useState(initialColor);
  // Мазок карандаша или ластика: плитка до него (для отмены одним шагом) и последняя
  // клетка (чтобы соединить её с новой отрезком).
  const stroke = useRef<{ before: Tile; last: [number, number] } | null>(null);

  const strokeColor = tool === 'eraser' ? null : color;

  const down = (x: number, y: number) => {
    if (tool === 'fill') {
      setHistory((h) => commit(h, floodFill(h.present, x, y, color)));
      return;
    }
    if (tool === 'picker') {
      // Пипетка по дыре берёт ластик: «этот цвет» здесь — прозрачность.
      const picked = pixelAt(history.present, x, y);
      if (picked) setColor(picked);
      setTool(picked ? 'pencil' : 'eraser');
      return;
    }
    stroke.current = { before: history.present, last: [x, y] };
    setHistory((h) =>
      preview(h, paintPixels(h.present, [[x, y]], strokeColor)),
    );
  };

  const move = (x: number, y: number) => {
    const current = stroke.current;
    if (!current || (current.last[0] === x && current.last[1] === y)) return;
    const points = linePoints(current.last, [x, y]);
    current.last = [x, y];
    setHistory((h) => preview(h, paintPixels(h.present, points, strokeColor)));
  };

  const up = () => {
    const current = stroke.current;
    if (!current) return;
    stroke.current = null;
    setHistory((h) => commitStroke(h, current.before));
  };

  // Выбор цвета из палитры возвращает к рисованию: после ластика или пипетки
  // пользователь берёт цвет, чтобы им красить.
  const chooseColor = (next: string) => {
    setColor(next);
    if (tool === 'eraser' || tool === 'picker') setTool('pencil');
  };

  return {
    tile: history.present,
    tool,
    setTool,
    color,
    chooseColor,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => setHistory(undo),
    redo: () => setHistory(redo),
    // Правки были, если есть что отменять: после отмены всех шагов плитка — исходная.
    dirty: history.present !== initial,
    down,
    move,
    up,
  };
}
