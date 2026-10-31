import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import MapTitle from './MapTitle';

describe('MapTitle', () => {
  it('✎ открывает поле на месте названия, сохранённое имя его закрывает', async () => {
    const onRename = vi.fn(() => Promise.resolve());
    renderWithProviders(<MapTitle name="Подвал" onRename={onRename} />);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: 'Переименовать карту' }),
    );
    const field = screen.getByLabelText('Название карты');
    await user.type(field, ' таверны{Enter}');

    expect(onRename).toHaveBeenCalledWith('Подвал таверны');
    expect(await screen.findByRole('heading')).toBeInTheDocument();
    expect(screen.queryByLabelText('Название карты')).not.toBeInTheDocument();
  });

  it('двойной щелчок по названию тоже открывает поле; без загруженной карты — нет', async () => {
    const { rerender } = renderWithProviders(
      <MapTitle name="Карта" onRename={null} />,
    );
    const user = userEvent.setup();
    expect(
      screen.queryByRole('button', { name: 'Переименовать карту' }),
    ).not.toBeInTheDocument();
    await user.dblClick(screen.getByRole('heading', { name: 'Карта' }));
    expect(screen.queryByLabelText('Название карты')).not.toBeInTheDocument();

    rerender(<MapTitle name="Подвал" onRename={() => Promise.resolve()} />);
    await user.dblClick(screen.getByRole('heading', { name: 'Подвал' }));
    expect(screen.getByLabelText('Название карты')).toHaveValue('Подвал');
  });
});
