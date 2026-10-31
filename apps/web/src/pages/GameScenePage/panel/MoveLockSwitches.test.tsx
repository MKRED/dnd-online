import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameFigure } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import MoveLockSwitches from './MoveLockSwitches';

const hero = (id: string, name: string, moveLocked = false) =>
  ({ character: { id, name }, image: null, moveLocked }) as GameFigure;

function renderSwitches(heroes: GameFigure[], busy = false) {
  const onLock = vi.fn();
  renderWithProviders(
    <MoveLockSwitches
      gameId="g1"
      heroes={heroes}
      busy={busy}
      onLock={onLock}
    />,
  );
  return onLock;
}

describe('MoveLockSwitches', () => {
  it('все ходят: общий выключает всех, свой — одного', async () => {
    const onLock = renderSwitches([hero('c1', 'Эльза'), hero('c2', 'Борн')]);
    const all = screen.getByRole('switch', { name: 'Игроки могут ходить' });
    expect(all).toBeChecked();
    expect(screen.queryByText(/стоит/)).toBeNull();
    await userEvent.click(all);
    expect(onLock).toHaveBeenLastCalledWith(null, true);
    await userEvent.click(
      screen.getByRole('switch', { name: 'Борн может ходить' }),
    );
    expect(onLock).toHaveBeenLastCalledWith('c2', true);
  });

  it('стоит один: счётчик, общий выключен и разрешает всем', async () => {
    const onLock = renderSwitches([
      hero('c1', 'Эльза'),
      hero('c2', 'Борн', true),
    ]);
    expect(screen.getByText('стоит 1 из 2')).toBeInTheDocument();
    const all = screen.getByRole('switch', { name: 'Игроки могут ходить' });
    expect(all).not.toBeChecked();
    await userEvent.click(all);
    expect(onLock).toHaveBeenLastCalledWith(null, false);
    await userEvent.click(
      screen.getByRole('switch', { name: 'Борн может ходить' }),
    );
    expect(onLock).toHaveBeenLastCalledWith('c2', false);
  });

  it('стоят все: общий снимает запрет со всех', async () => {
    const onLock = renderSwitches([
      hero('c1', 'Эльза', true),
      hero('c2', 'Борн', true),
    ]);
    expect(screen.getByText('все стоят')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('switch', { name: 'Игроки могут ходить' }),
    );
    expect(onLock).toHaveBeenLastCalledWith(null, false);
  });

  it('пока правка в пути — переключатели недоступны; без героев — ничего', () => {
    renderSwitches([hero('c1', 'Эльза')], true);
    for (const s of screen.getAllByRole('switch')) expect(s).toBeDisabled();
  });

  it('без героев на сцене блока нет', () => {
    renderSwitches([]);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
