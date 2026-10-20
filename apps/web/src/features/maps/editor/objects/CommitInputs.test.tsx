import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import { QuantityInput } from './CommitInputs';

describe('QuantityInput', () => {
  it('отклонённая правка: по её окончании поле возвращается к значению', async () => {
    const onCommit = vi.fn();
    const field = (disabled: boolean) => (
      <QuantityInput
        value={1}
        onCommit={onCommit}
        aria-label="Количество"
        disabled={disabled}
      />
    );
    const { rerender } = renderWithProviders(field(false));
    const input = screen.getByRole('textbox', { name: 'Количество' });
    await userEvent.clear(input);
    await userEvent.type(input, '2');
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(2);

    // Правка идёт, потом сервер её отклонил: значение осталось 1.
    rerender(field(true));
    rerender(field(false));
    expect(screen.getByRole('textbox', { name: 'Количество' })).toHaveValue(
      '1',
    );
  });
});
