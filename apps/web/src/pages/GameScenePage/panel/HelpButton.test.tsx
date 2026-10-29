import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import HelpButton from './HelpButton';

// «?» на компьютере открывает окошко с клавишами (баг 2026-10-24: Tooltip внутри
// Popover.Target съедал щелчок, окошко не открывалось).
describe('HelpButton', () => {
  it('щелчок открывает и закрывает подсказки', async () => {
    renderWithProviders(<HelpButton master editing={false} />);
    const button = screen.getByRole('button', {
      name: 'Подсказки и горячие клавиши',
    });
    await userEvent.click(button);
    expect(await screen.findByText('Камера')).toBeInTheDocument();
    expect(screen.getByText('режим «Игра» или «Правка»')).toBeInTheDocument();
    // Отмена — только в «Правке».
    expect(
      screen.queryByText('отменить правку или ход'),
    ).not.toBeInTheDocument();
    await userEvent.click(button);
    await vi.waitFor(() =>
      expect(screen.queryByText('Камера')).not.toBeInTheDocument(),
    );
  });

  it('в «Правке» показывает отмену', async () => {
    renderWithProviders(<HelpButton master editing />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Подсказки и горячие клавиши' }),
    );
    expect(
      await screen.findByText('отменить правку или ход'),
    ).toBeInTheDocument();
  });
});
