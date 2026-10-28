import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  clampPanelWidth,
  collapsesAt,
  DEFAULT_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  PANEL_WIDTH_STEP,
} from './panelWidth';
import classes from './ScenePanel.module.css';

export interface PanelEdgeDrag {
  width: number;
  // Отпустят сейчас — панель свернётся.
  collapsing: boolean;
}

interface PanelEdgeProps {
  width: number;
  // Отпустили, двойной щелчок или стрелки: новая ширина, её запомнить.
  onWidth: (width: number) => void;
  // Пока тянут — ширина под мышью, null — отпустили.
  onDrag: (drag: PanelEdgeDrag | null) => void;
  // Утянули вправо дальше минимума и отпустили.
  onCollapse: () => void;
}

// Панель стоит в странице: от её ширины считается половина. Ширину самой панели берём
// с экрана — на узком окне CSS мог ужать запомненную.
function measure(edge: HTMLElement) {
  const panel = edge.parentElement;
  return {
    panel: panel?.getBoundingClientRect().width ?? DEFAULT_PANEL_WIDTH,
    page: panel?.parentElement?.clientWidth ?? 0,
  };
}

// Левый край панели на компьютере (вариант А, 2026-10-28): тянут мышью — панель идёт за
// ней плавно, дальше минимума вправо — сворачивается; двойной щелчок — обычная ширина.
function PanelEdge({ width, onWidth, onDrag, onCollapse }: PanelEdgeProps) {
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
    start.current = { x: event.clientX, ...measure(event.currentTarget) };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const raw = rawAt(event);
    if (raw === null || !start.current) return;
    onDrag({
      width: clampPanelWidth(raw, start.current.page),
      collapsing: collapsesAt(raw),
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
    if (collapsesAt(raw)) onCollapse();
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
    const { panel, page } = measure(event.currentTarget);
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
      title="Тяните, чтобы изменить ширину; дальше вправо — свернуть. Двойной щелчок — обычная ширина"
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
        onDrag(null);
      }}
      onDoubleClick={() => onWidth(DEFAULT_PANEL_WIDTH)}
      onKeyDown={key}
    />
  );
}

export default PanelEdge;
