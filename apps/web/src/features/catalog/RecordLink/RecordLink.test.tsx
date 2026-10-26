import { Tooltip } from '@mantine/core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import RecordLink from './RecordLink';
import { RecordLinkContext } from './recordLinkContext';

describe('RecordLink', () => {
  it('вне сцены ведёт на страницу записи', () => {
    renderWithProviders(
      <RecordLink kind="ability" id="a1" name="Удар">
        Удар
      </RecordLink>,
    );
    expect(screen.getByRole('link', { name: 'Удар' })).toHaveAttribute(
      'href',
      '/abilities/a1',
    );
  });

  it('на сцене открывает окно записи вместо перехода', async () => {
    const open = vi.fn();
    renderWithProviders(
      <RecordLinkContext.Provider value={open}>
        <RecordLink kind="effect" id="e1" name="Захват">
          Захват
        </RecordLink>
      </RecordLinkContext.Provider>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Захват' }));
    expect(open).toHaveBeenCalledWith('effect', 'e1', 'Захват');
  });

  it('под подсказкой щелчок тоже открывает окно', async () => {
    const open = vi.fn();
    renderWithProviders(
      <RecordLinkContext.Provider value={open}>
        <Tooltip label="Бессрочно">
          <RecordLink kind="effect" id="e1" name="Захват">
            Захват
          </RecordLink>
        </Tooltip>
      </RecordLinkContext.Provider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Захват' }));
    expect(open).toHaveBeenCalledWith('effect', 'e1', 'Захват');
  });
});
