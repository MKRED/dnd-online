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
    await userEvent.click(button);
    await vi.waitFor(() =>
      expect(screen.queryByText('Камера')).not.toBeInTheDocument(),
    );
  });
});
