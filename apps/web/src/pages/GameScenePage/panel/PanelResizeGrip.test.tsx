import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import PanelResizeGrip from './PanelResizeGrip';

// Ручка стоит в панели, панель — в странице: высоту страницы ручка берёт у деда.
function setup(size = 2) {
  const onSize = vi.fn<(size: number) => void>();
  const onDrag = vi.fn<(share: number | null) => void>();
  renderWithProviders(
    <div data-testid="page">
      <aside>
        <PanelResizeGrip size={size} onSize={onSize} onDrag={onDrag} />
      </aside>
    </div>,
  );
  Object.defineProperty(screen.getByTestId('page'), 'clientHeight', {
    value: 800,
  });
  const grip = screen.getByRole('slider', { name: 'Высота панели' });
  // В jsdom захвата указателя нет.
  grip.setPointerCapture = vi.fn();
  return { onSize, onDrag, grip };
}

describe('PanelResizeGrip', () => {
  it('показывает положение: 3 из 5', () => {
    const { grip } = setup();
    expect(grip).toHaveAttribute('aria-valuetext', 'Высота панели: 3 из 5');
  });

  it('тянут вверх — панель за пальцем, отпустили — ближайшее положение', () => {
    const { grip, onSize, onDrag } = setup();
    fireEvent.pointerDown(grip, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientY: 420, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith(expect.closeTo(0.5));
    fireEvent.pointerUp(grip, { clientY: 330, pointerId: 1 });
    expect(onDrag).toHaveBeenLastCalledWith(null);
    // 0.4 + 170/800 ≈ 0.61 — пятое положение.
    expect(onSize).toHaveBeenLastCalledWith(4);
  });

  it('касание без сдвига — следующее положение', () => {
    const { grip, onSize } = setup(4);
    fireEvent.pointerDown(grip, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientY: 503, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientY: 503, pointerId: 1 });
    expect(onSize).toHaveBeenCalledTimes(1);
    expect(onSize).toHaveBeenLastCalledWith(0);
  });

  it('стрелки — на одно положение, без выхода за края', async () => {
    const { grip, onSize } = setup(0);
    grip.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onSize).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard('{ArrowUp}');
    expect(onSize).toHaveBeenLastCalledWith(1);
  });
});
