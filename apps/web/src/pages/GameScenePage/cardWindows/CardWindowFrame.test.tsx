import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CardWindowFrame from './CardWindowFrame';

// Окно карточки (docs/plan/scene-page.md, этап 4): сворачивание, закрытие, перетаскивание
// за шапку, имя-ссылка на полную страницу.
function renderFrame(minimized = false, href: string | null = null) {
  const handlers = {
    onMove: vi.fn(),
    onMinimize: vi.fn(),
    onClose: vi.fn(),
    onRaise: vi.fn(),
  };
  renderWithProviders(
    <CardWindowFrame
      title="Гоблин"
      href={href}
      subtitle="Монстр"
      portrait={null}
      x={100}
      y={50}
      z={0}
      minimized={minimized}
      {...handlers}
    >
      <p>Содержимое</p>
    </CardWindowFrame>,
  );
  return handlers;
}

describe('CardWindowFrame', () => {
  it('сворачивается в шапку и закрывается', async () => {
    const handlers = renderFrame();
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Свернуть карточку' }),
    );
    expect(handlers.onMinimize).toHaveBeenCalledWith(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Закрыть карточку' }),
    );
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('свёрнутое — только шапка', () => {
    renderFrame(true);
    expect(screen.queryByText('Содержимое')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Развернуть карточку' }),
    ).toBeInTheDocument();
  });

  it('тянется за шапку и не уходит за левый и верхний край; щелчок поднимает', () => {
    const handlers = renderFrame();
    const header = screen.getByText('Гоблин').closest('div')!.parentElement!;
    // jsdom не умеет захват указателя — достаточно заглушки.
    header.setPointerCapture = vi.fn();
    fireEvent.pointerDown(header, { clientX: 110, clientY: 60, pointerId: 1 });
    expect(handlers.onRaise).toHaveBeenCalled();
    fireEvent.pointerMove(header, { clientX: 150, clientY: 90, pointerId: 1 });
    expect(handlers.onMove).toHaveBeenLastCalledWith(140, 80);
    fireEvent.pointerMove(header, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(handlers.onMove).toHaveBeenLastCalledWith(0, 0);
    fireEvent.pointerUp(header, { pointerId: 1 });
    handlers.onMove.mockClear();
    fireEvent.pointerMove(header, { clientX: 300, clientY: 300, pointerId: 1 });
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  it('имя ведёт на полную страницу в новой вкладке и не тянет окно', () => {
    const handlers = renderFrame(false, '/monsters/m1');
    const link = screen.getByRole('link', { name: 'Гоблин' });
    expect(link).toHaveAttribute('href', '/monsters/m1');
    expect(link).toHaveAttribute('target', '_blank');
    const header = link.closest('div')!.parentElement!;
    header.setPointerCapture = vi.fn();
    fireEvent.pointerDown(link, { clientX: 110, clientY: 60, pointerId: 1 });
    fireEvent.pointerMove(header, { clientX: 150, clientY: 90, pointerId: 1 });
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  it('без страницы имя — просто текст', () => {
    renderFrame();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
