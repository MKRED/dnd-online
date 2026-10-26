import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CombatOverlay from './CombatOverlay';
import { MODE_NOTICE_MS } from './useModeNotice';

// Плашка боя и уведомление игроку (макет «Режимы хода на сцене», вариант В).
describe('CombatOverlay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('вне боя ничего; бой начался — плашка и уведомление, оно гаснет само', () => {
    vi.useFakeTimers();
    const view = renderWithProviders(
      <CombatOverlay mode="free" round={null} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    view.rerender(<CombatOverlay mode="tactical" round={1} />);
    expect(screen.getByRole('status')).toHaveTextContent('Бой · раунд 1');
    expect(screen.getByText('Мастер начал бой')).toBeInTheDocument();

    view.rerender(<CombatOverlay mode="tactical" round={2} />);
    expect(screen.getByRole('status')).toHaveTextContent('Бой · раунд 2');
    act(() => {
      vi.advanceTimersByTime(MODE_NOTICE_MS);
    });
    expect(screen.queryByText('Мастер начал бой')).not.toBeInTheDocument();
  });

  it('вошёл посреди боя — плашка без уведомления; бой окончен — уведомление, его можно скрыть', async () => {
    const view = renderWithProviders(
      <CombatOverlay mode="tactical" round={3} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Бой · раунд 3');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    view.rerender(<CombatOverlay mode="free" round={null} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('alert', { name: 'Бой окончен' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Скрыть' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('вне встречи — «только просмотр» вместо плашки боя; конец и начало встречи — уведомления', () => {
    const view = renderWithProviders(
      <CombatOverlay mode="tactical" round={2} watchOnly={false} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Бой · раунд 2');

    view.rerender(<CombatOverlay mode="tactical" round={2} watchOnly />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Встреча не идёт · только просмотр',
    );
    expect(screen.queryByText('Бой · раунд 2')).not.toBeInTheDocument();
    expect(
      screen.getByRole('alert', { name: 'Мастер завершил встречу' }),
    ).toBeInTheDocument();

    view.rerender(
      <CombatOverlay mode="tactical" round={2} watchOnly={false} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Бой · раунд 2');
    expect(
      screen.getByRole('alert', { name: 'Встреча началась' }),
    ).toBeInTheDocument();
  });

  it('пока фигурки не прочитаны — ничего', () => {
    renderWithProviders(<CombatOverlay mode={null} round={null} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
