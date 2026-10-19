import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CenterHint from './CenterHint';

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
