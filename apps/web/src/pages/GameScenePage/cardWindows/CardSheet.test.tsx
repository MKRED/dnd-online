import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import CardSheet from './CardSheet';
import type { CardView } from './CardWindows';
import type { CardWindows } from './useCardWindows';

function view(key: string, title: string): CardView {
  return {
    window: {
      key,
      target: { kind: 'creature', objectId: 1 },
      x: 0,
      y: 0,
      minimized: false,
      height: null,
    },
    title,
    href: null,
    subtitle: '',
    portrait: null,
    body: null,
  };
}

describe('CardSheet', () => {
  it('открытая карточка — первым чипом слева, дальше от новой к старой', async () => {
    const raise = vi.fn();
    // Порядок окон — от старого к новому, открыто последнее.
    renderWithProviders(
      <CardSheet
        views={[
          view('a', 'Серафина'),
          view('b', 'Волшебная стрела'),
          view('c', 'Божественная искра'),
        ]}
        windows={{ raise } as unknown as CardWindows}
      />,
    );
    const chips = screen.getAllByRole('checkbox');
    expect(chips.map((chip) => chip.closest('div')?.textContent)).toEqual([
      'Божественная искра',
      'Волшебная стрела',
      'Серафина',
    ]);
    expect(chips[0]).toBeChecked();
    await userEvent.click(screen.getByText('Серафина'));
    expect(raise).toHaveBeenCalledWith('a');
  });
});
