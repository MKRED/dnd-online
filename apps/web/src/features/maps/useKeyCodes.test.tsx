import { fireEvent, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { useKeyCodes } from './useKeyCodes';

function Keys({ onShift }: { onShift: (dy: number) => void }) {
  useKeyCodes({ KeyQ: () => onShift(-1), KeyE: () => onShift(1) });
  return <input aria-label="Поле" />;
}

describe('useKeyCodes', () => {
  it('E поднимает, Q опускает — по месту клавиши, и в русской раскладке', () => {
    const onShift = vi.fn();
    renderWithProviders(<Keys onShift={onShift} />);

    fireEvent.keyDown(window, { code: 'KeyE', key: 'e' });
    fireEvent.keyDown(window, { code: 'KeyQ', key: 'й' });
    expect(onShift.mock.calls).toEqual([[1], [-1]]);
  });

  it('не срабатывает в поле ввода и с Ctrl', () => {
    const onShift = vi.fn();
    renderWithProviders(<Keys onShift={onShift} />);

    fireEvent.keyDown(screen.getByLabelText('Поле'), { code: 'KeyE' });
    fireEvent.keyDown(window, { code: 'KeyE', ctrlKey: true });
    fireEvent.keyDown(window, { code: 'KeyW' });
    expect(onShift).not.toHaveBeenCalled();
  });

  it('active = false выключает все клавиши', () => {
    const onE = vi.fn();
    const { rerender } = renderHook(
      ({ active }) => useKeyCodes({ KeyE: onE }, active),
      { initialProps: { active: false } },
    );
    fireEvent.keyDown(window, { code: 'KeyE' });
    expect(onE).not.toHaveBeenCalled();
    rerender({ active: true });
    fireEvent.keyDown(window, { code: 'KeyE' });
    expect(onE).toHaveBeenCalledOnce();
  });
});
