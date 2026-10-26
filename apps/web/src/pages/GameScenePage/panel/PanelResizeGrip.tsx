import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { nearestPanelSize, nextPanelSize, PANEL_SIZES } from './panelHeight';
import classes from './ScenePanel.module.css';

interface PanelResizeGripProps {
  // Номер положения с 0.
  size: number;
  // Отпустили или нажали: новое положение, его запомнить.
  onSize: (size: number) => void;
  // Пока тянут — доля страницы под пальцем, null — отпустили.
  onDrag: (share: number | null) => void;
}

// Сдвиг меньше — касание, а не перетаскивание.
const TAP_SLOP = 6;

// Высота страницы, в которой стоит панель: от неё считается доля.
function pageHeight(grip: HTMLElement) {
  return grip.parentElement?.parentElement?.clientHeight ?? 0;
}

// Ручка над шапкой панели на телефоне (вариант Б): касание — следующее положение, тянут —
// панель идёт за пальцем и защёлкивается в ближайшем. Точки справа — какое положение
// сейчас.
function PanelResizeGrip({ size, onSize, onDrag }: PanelResizeGripProps) {
  const start = useRef<{ y: number; page: number; moved: boolean } | null>(
    null,
  );
  const shareAt = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    if (!from || from.page <= 0) return null;
    // Ручка сверху панели: движение вверх (y меньше) делает панель выше.
    return PANEL_SIZES[size] + (from.y - event.clientY) / from.page;
  };

  const down = (event: PointerEvent<HTMLDivElement>) => {
    // Иначе касание прокручивает страницу или выделяет текст вместо того, чтобы тянуть.
    event.preventDefault();
    start.current = {
      y: event.clientY,
      page: pageHeight(event.currentTarget),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    if (!from) return;
    if (Math.abs(event.clientY - from.y) >= TAP_SLOP) from.moved = true;
    const share = shareAt(event);
    if (from.moved && share !== null) onDrag(share);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    const share = shareAt(event);
    start.current = null;
    if (!from) return;
    onDrag(null);
    if (!from.moved) onSize(nextPanelSize(size));
    else if (share !== null) onSize(nearestPanelSize(share));
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSize(nextPanelSize(size));
    } else if (step !== 0) {
      event.preventDefault();
      onSize(Math.min(PANEL_SIZES.length - 1, Math.max(0, size + step)));
    }
  };

  const label = `Высота панели: ${size + 1} из ${PANEL_SIZES.length}`;
  return (
    <div
      className={classes.grip}
      role="slider"
      aria-orientation="vertical"
      aria-label="Высота панели"
      aria-valuemin={1}
      aria-valuemax={PANEL_SIZES.length}
      aria-valuenow={size + 1}
      aria-valuetext={label}
      title={`${label}. Нажмите — следующая, или тяните`}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null;
        onDrag(null);
      }}
      onKeyDown={key}
    >
      <span className={classes.gripBar} />
      <span className={classes.gripSizes} aria-hidden>
        {PANEL_SIZES.map((share, index) => (
          <span key={share} data-on={index === size || undefined} />
        ))}
      </span>
    </div>
  );
}

export default PanelResizeGrip;
