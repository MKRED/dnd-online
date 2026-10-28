import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import classes from './PanelEdge.module.css';
import {
  clampPanelWidth,
  collapsesAt,
  MIN_PANEL_WIDTH,
  PANEL_WIDTH_STEP,
} from './panelWidth';

export interface PanelEdgeDrag {
  width: number;
  // Отпустят сейчас — панель свернётся.
  collapsing: boolean;
}

export interface PanelEdgeProps {
  width: number;
  // Обычная ширина этой панели — её возвращает двойной щелчок.
  defaultWidth: number;
  // Отпустили, двойной щелчок или стрелки: новая ширина, её запомнить.
  onWidth: (width: number) => void;
  // Пока тянут — ширина под мышью, null — отпустили.
  onDrag: (drag: PanelEdgeDrag | null) => void;
  // Утянули вправо дальше минимума и отпустили. Нет — панель не сворачивается (у
  // редактора карт свёрнутой панели нет), край встаёт на минимум.
  onCollapse?: () => void;
}

// Панель стоит в странице: от её ширины считается половина. Ширину самой панели берём
// с экрана — на узком окне CSS мог ужать запомненную.
function measure(edge: HTMLElement, fallback: number) {
  const panel = edge.parentElement;
  return {
    panel: panel?.getBoundingClientRect().width ?? fallback,
    page: panel?.parentElement?.clientWidth ?? 0,
  };
}

// Левый край правой панели на компьютере (вариант А, 2026-10-28): тянут мышью — панель
// идёт за ней плавно, дальше минимума вправо — сворачивается (если умеет); двойной
// щелчок — обычная ширина. Стоит первым в панели, у панели position: relative.
function PanelEdge({
  width,
  defaultWidth,
  onWidth,
  onDrag,
  onCollapse,
}: PanelEdgeProps) {
  const collapses = (raw: number) => !!onCollapse && collapsesAt(raw);
  const start = useRef<{ x: number; panel: number; page: number } | null>(null);
  // Панель справа: движение влево (x меньше) делает её шире.
  const rawAt = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    return from ? from.panel + (from.x - event.clientX) : null;
  };

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // Иначе тянется выделение текста в панели.
    event.preventDefault();
    start.current = {
      x: event.clientX,
      ...measure(event.currentTarget, defaultWidth),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const raw = rawAt(event);
    if (raw === null || !start.current) return;
    onDrag({
      width: clampPanelWidth(raw, start.current.page),
      collapsing: collapses(raw),
    });
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    const raw = rawAt(event);
    start.current = null;
    if (!from || raw === null) return;
    onDrag(null);
    // Щелчок без сдвига ширину не трогает: иначе он «запоминал» бы ужатую CSS ширину.
    if (raw === from.panel) return;
    if (onCollapse && collapses(raw)) onCollapse();
    else onWidth(clampPanelWidth(raw, from.page));
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowLeft'
        ? PANEL_WIDTH_STEP
        : event.key === 'ArrowRight'
          ? -PANEL_WIDTH_STEP
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const { panel, page } = measure(event.currentTarget, defaultWidth);
    onWidth(clampPanelWidth(panel + step, page));
  };

  return (
    <div
      className={classes.edge}
      role="separator"
      aria-orientation="vertical"
      aria-label="Ширина панели"
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuenow={width}
      title={`Тяните, чтобы изменить ширину${onCollapse ? '; дальше вправо — свернуть' : ''}. Двойной щелчок — обычная ширина`}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
        onDrag(null);
      }}
      onDoubleClick={() => onWidth(defaultWidth)}
      onKeyDown={key}
    />
  );
}

export default PanelEdge;
