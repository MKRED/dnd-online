import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { D20Roll } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import RollWindow from './RollWindow';

const PENDING = {
  terms: [{ kind: 'number' as const, label: 'Ловкость', amount: 3 }],
  reasons: { advantage: [], disadvantage: ['Врасплох'] },
};

const ROLL: D20Roll = {
  dice: [17, 4],
  kept: 1,
  mode: 'disadvantage',
  reasons: PENDING.reasons,
  master: null,
  terms: [{ kind: 'number', label: 'Ловкость', amount: 3 }],
  total: 7,
};

function renderWindow(
  master: boolean,
  onRoll = vi.fn(() => Promise.resolve(ROLL)),
) {
  const onClose = vi.fn();
  renderWithProviders(
    <RollWindow
      opened
      title="Инициатива"
      caption="проверка Ловкости"
      name="Лира"
      pending={PENDING}
      master={master}
      onRoll={onRoll}
      onClose={onClose}
    />,
  );
  return { onRoll, onClose };
}

describe('RollWindow', () => {
  it('до броска — слагаемые и помеха, после — обе кости и итог', async () => {
    const { onRoll, onClose } = renderWindow(false);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Помеха')).toBeInTheDocument();
    expect(within(dialog).getByText('Помеха: Врасплох')).toBeInTheDocument();
    expect(within(dialog).getByText('+3')).toBeInTheDocument();
    // Игроку переключателя нет: бросок по правилам.
    expect(within(dialog).queryByText('По правилам')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      within(dialog).getByRole('button', { name: 'Бросить кубик' }),
    );
    expect(onRoll).toHaveBeenCalledWith(null);
    expect(
      await within(dialog).findByText('Итог', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('7')).toBeInTheDocument();
    // Засчитана меньшая — 4; 17 — отброшенная кость.
    expect(within(dialog).getByText('17')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Готово' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('мастер бросает с преимуществом вместо правил', async () => {
    const { onRoll } = renderWindow(true);
    const user = userEvent.setup();
    await user.click(screen.getByText('Преимущество'));
    expect(screen.getAllByText('Преимущество').length).toBeGreaterThan(1);
    await user.click(screen.getByRole('button', { name: 'Бросить кубик' }));
    expect(onRoll).toHaveBeenCalledWith('advantage');
  });

  it('ошибка броска — сообщение и снова кнопка', async () => {
    renderWindow(
      false,
      vi.fn(() => Promise.reject(new Error('сеть'))),
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Бросить кубик' }));
    expect(
      await screen.findByText(
        'Не удалось бросить кубик',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Бросить кубик' })).toBeEnabled();
  });
});
