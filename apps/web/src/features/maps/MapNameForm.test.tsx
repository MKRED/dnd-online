import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { MapNameForm } from './MapNameForm';

describe('MapNameForm', () => {
  it('сохраняет имя без пробелов по краям и закрывается', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    renderWithProviders(
      <MapNameForm initial="Подвал" onSave={onSave} onClose={onClose} />,
    );
    const user = userEvent.setup();
    const field = screen.getByLabelText('Название карты');
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, '  Подвал таверны ');
    await user.click(
      screen.getByRole('button', { name: 'Сохранить название' }),
    );

    expect(onSave).toHaveBeenCalledWith('Подвал таверны');
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('то же имя — просто закрыть, без запроса; ✕ — отмена', async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const onClose = vi.fn();
    renderWithProviders(
      <MapNameForm initial="Подвал" onSave={onSave} onClose={onClose} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Название карты'), ' {Enter}');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Отменить переименование' }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ошибка сохранения — под полем, поле не закрывается', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('сеть')));
    const onClose = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(
      <MapNameForm initial="Подвал" onSave={onSave} onClose={onClose} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Название карты'), '2{Enter}');

    expect(
      await screen.findByText('Не удалось переименовать карту'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Название карты')).toBeEnabled();
  });
});
