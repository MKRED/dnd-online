import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CenterHint from './CenterHint';
import { useCameraKeys } from './useCameraKeys';

describe('CenterHint', () => {
  it('показывает уровень центра, ▲ поднимает, ▼ опускает', async () => {
    const onShift = vi.fn();
    renderWithProviders(<CenterHint level={5} onShift={onShift} />);

    expect(screen.getByText('Центр: y = 5')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Поднять центр' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Опустить центр' }),
    );
    expect(onShift.mock.calls).toEqual([[1], [-1]]);
  });

  it('пока камера не готова, подсказки нет', () => {
    renderWithProviders(<CenterHint level={null} onShift={vi.fn()} />);
    expect(screen.queryByText(/Центр/)).not.toBeInTheDocument();
  });
});

function Keys({ onShift }: { onShift: (dy: number) => void }) {
  useCameraKeys(onShift);
  return <input aria-label="Поле" />;
}

describe('useCameraKeys', () => {
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
});
