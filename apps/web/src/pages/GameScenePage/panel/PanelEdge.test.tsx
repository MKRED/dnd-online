import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import PanelEdge, { type PanelEdgeDrag } from './PanelEdge';

// Край стоит в панели, панель — в странице: ширину страницы край берёт у деда, свою —
// у родителя.
function setup(width = 352) {
  const onWidth = vi.fn<(width: number) => void>();
  const onDrag = vi.fn<(drag: PanelEdgeDrag | null) => void>();
  const onCollapse = vi.fn<() => void>();
  renderWithProviders(
    <div data-testid="page">
      <aside data-testid="panel">
        <PanelEdge
          width={width}
          onWidth={onWidth}
          onDrag={onDrag}
          onCollapse={onCollapse}
        />
      </aside>
    </div>,
  );
  Object.defineProperty(screen.getByTestId('page'), 'clientWidth', {
    value: 1600,
  });
  screen.getByTestId('panel').getBoundingClientRect = () =>
    ({ width }) as DOMRect;
  const edge = screen.getByRole('separator', { name: 'Ширина панели' });
  // В jsdom захвата указателя нет.
  edge.setPointerCapture = vi.fn();
  return { edge, onWidth, onDrag, onCollapse };
}

describe('PanelEdge', () => {
  it('тянут влево — панель шире за мышью, отпустили — ширина запомнена', () => {
    const { edge, onWidth, onDrag, onCollapse } = setup();
    fireEvent.pointerDown(edge, { clientX: 1200, button: 0, pointerId: 1 });
    fireEvent.pointerMove(edge, { clientX: 1100, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith({ width: 452, collapsing: false });
    fireEvent.pointerUp(edge, { clientX: 1000, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith(null);
    expect(onWidth).toHaveBeenLastCalledWith(552);
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('не шире половины страницы', () => {
    const { edge, onWidth } = setup();
    fireEvent.pointerDown(edge, { clientX: 1200, button: 0, pointerId: 1 });
    fireEvent.pointerUp(edge, { clientX: 100, pointerId: 1 });
    expect(onWidth).toHaveBeenLastCalledWith(800);
  });

  it('вправо до минимума — 18rem; дальше — свернуть', () => {
    const { edge, onWidth, onDrag, onCollapse } = setup();
    fireEvent.pointerDown(edge, { clientX: 1200, button: 0, pointerId: 1 });
    fireEvent.pointerMove(edge, { clientX: 1290, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith({ width: 288, collapsing: false });
    fireEvent.pointerMove(edge, { clientX: 1340, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith({ width: 288, collapsing: true });
    fireEvent.pointerUp(edge, { clientX: 1340, pointerId: 1 });
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(onWidth).not.toHaveBeenCalled();
  });

  it('щелчок без сдвига ширину не меняет, двойной — обычная', () => {
    const { edge, onWidth } = setup(500);
    fireEvent.pointerDown(edge, { clientX: 1200, button: 0, pointerId: 1 });
    fireEvent.pointerUp(edge, { clientX: 1200, pointerId: 1 });
    expect(onWidth).not.toHaveBeenCalled();
    fireEvent.doubleClick(edge);
    expect(onWidth).toHaveBeenLastCalledWith(352);
  });

  it('стрелки: ← шире, → уже', async () => {
    const { edge, onWidth } = setup();
    edge.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onWidth).toHaveBeenLastCalledWith(368);
    await userEvent.keyboard('{ArrowRight}');
    expect(onWidth).toHaveBeenLastCalledWith(336);
  });
});
